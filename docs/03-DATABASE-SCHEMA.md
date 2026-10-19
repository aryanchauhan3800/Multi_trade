# Database Architecture & Relational Schema (PostgreSQL & Prisma)

## 1. Schema Design Principles

1. **Arbitrary Precision Arithmetic**:
   - Floating-point IEEE-754 approximations cause rounding errors in financial systems.
   - All balance, price, volume, margin, and fee columns strictly use `Decimal(28, 8)` (maps to `NUMERIC(28, 8)` in PostgreSQL).
2. **Immutability of Financial Events**:
   - `order_events`, `trades`, `transactions`, and `audit_logs` are strictly **append-only** tables.
   - Updates never overwrite historic fill prices or balances.
3. **Optimistic Concurrency & Foreign Keys**:
   - Relational integrity enforced at database level with `ON DELETE RESTRICT` for financial ledgers.
   - Account and balance updates utilize version integers for optimistic locking.

---

## 2. Complete Prisma Schema Definition

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// -------------------------------------------------------------
// USER & SECURITY DOMAIN
// -------------------------------------------------------------

enum UserRole {
  USER
  TRADER
  SUPPORT
  ADMIN
}

enum AccountEnvironment {
  DEVELOPMENT
  PAPER_TRADING
  LIVE
}

model User {
  id             String         @id @default(uuid())
  email          String         @unique
  passwordHash   String
  firstName      String?
  lastName       String?
  role           UserRole       @default(TRADER)
  isEmailVerified Boolean       @default(false)
  twoFactorSecret String?
  isTwoFactorEnabled Boolean    @default(false)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  accounts       Account[]
  watchlists     Watchlist[]
  sessions       Session[]
  notifications  Notification[]
  auditLogs      AuditLog[]

  @@index([email])
}

model Session {
  id           String    @id @default(uuid())
  userId       String
  token        String    @unique
  userAgent    String?
  ipAddress    String?
  expiresAt    DateTime
  createdAt    DateTime  @default(now())

  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}

// -------------------------------------------------------------
// ACCOUNT & BALANCE LEDGER DOMAIN
// -------------------------------------------------------------

model Account {
  id             String             @id @default(uuid())
  userId         String
  accountNumber  String             @unique
  currency       String             @default("USD")
  environment    AccountEnvironment @default(PAPER_TRADING)
  leverage       Int                @default(100) // e.g. 1:100
  isActive       Boolean            @default(true)
  version        Int                @default(0) // Optimistic locking
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  user           User               @relation(fields: [userId], references: [id], onDelete: Restrict)
  balances       Balance[]
  orders         Order[]
  trades         Trade[]
  positions      Position[]
  transactions   Transaction[]
  deposits       Deposit[]
  withdrawals    Withdrawal[]

  @@index([userId])
  @@index([accountNumber])
  @@index([environment])
}

model Balance {
  id           String   @id @default(uuid())
  accountId    String
  currency     String   @default("USD")
  total        Decimal  @default(0.0) @db.Decimal(28, 8) // Settled cash balance
  available    Decimal  @default(0.0) @db.Decimal(28, 8) // Free cash for new orders
  locked       Decimal  @default(0.0) @db.Decimal(28, 8) // Margin collateral locked
  updatedAt    DateTime @updatedAt

  account      Account  @relation(fields: [accountId], references: [id], onDelete: Restrict)

  @@unique([accountId, currency])
  @@index([accountId])
}

// -------------------------------------------------------------
// INSTRUMENTS & MARKET DATA DOMAIN
// -------------------------------------------------------------

enum AssetClass {
  FOREX
  CRYPTO
  STOCKS
  INDICES
  COMMODITIES
}

model Instrument {
  id             String      @id @default(uuid())
  symbol         String      @unique // e.g., "BTCUSD", "EURUSD", "AAPL"
  baseAsset      String      // e.g., "BTC", "EUR"
  quoteAsset     String      // e.g., "USD"
  name           String
  assetClass     AssetClass
  lotSize        Decimal     @default(1.0) @db.Decimal(28, 8)
  minQuantity    Decimal     @default(0.01) @db.Decimal(28, 8)
  maxQuantity    Decimal     @default(1000.0) @db.Decimal(28, 8)
  quantityStep   Decimal     @default(0.01) @db.Decimal(28, 8)
  priceTickSize  Decimal     @default(0.00001) @db.Decimal(28, 8)
  spreadMarkup   Decimal     @default(0.0) @db.Decimal(28, 8)
  isTradable     Boolean     @default(true)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  orders         Order[]
  trades         Trade[]
  positions      Position[]
  watchlistItems WatchlistItem[]

  @@index([symbol])
  @@index([assetClass])
}

model Watchlist {
  id         String          @id @default(uuid())
  userId     String
  name       String
  isDefault  Boolean         @default(false)
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt

  user       User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  items      WatchlistItem[]

  @@index([userId])
}

model WatchlistItem {
  id           String     @id @default(uuid())
  watchlistId  String
  instrumentId String
  displayOrder Int        @default(0)
  createdAt    DateTime   @default(now())

  watchlist    Watchlist  @relation(fields: [watchlistId], references: [id], onDelete: Cascade)
  instrument   Instrument @relation(fields: [instrumentId], references: [id], onDelete: Restrict)

  @@unique([watchlistId, instrumentId])
  @@index([watchlistId])
}

// -------------------------------------------------------------
// ORDER EXECUTION & TRADING DOMAIN
// -------------------------------------------------------------

enum OrderSide {
  BUY
  SELL
}

enum OrderType {
  MARKET
  LIMIT
  STOP
  STOP_LIMIT
}

enum OrderStatus {
  PENDING
  OPEN
  PARTIALLY_FILLED
  FILLED
  CANCELLED
  REJECTED
  EXPIRED
}

model Order {
  id               String       @id @default(uuid()) // Internal ID
  providerId       String?      // External Broker/Exchange Order ID
  accountId        String
  instrumentId     String
  clientOrderId    String       @unique
  side             OrderSide
  type             OrderType
  quantity         Decimal      @db.Decimal(28, 8)
  price            Decimal?     @db.Decimal(28, 8)
  stopLoss         Decimal?     @db.Decimal(28, 8)
  takeProfit       Decimal?     @db.Decimal(28, 8)
  filledQuantity   Decimal      @default(0.0) @db.Decimal(28, 8)
  averageFillPrice Decimal?     @db.Decimal(28, 8)
  fee              Decimal      @default(0.0) @db.Decimal(28, 8)
  feeCurrency      String       @default("USD")
  marginLocked     Decimal      @default(0.0) @db.Decimal(28, 8)
  status           OrderStatus  @default(PENDING)
  rejectionReason  String?
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  account          Account      @relation(fields: [accountId], references: [id], onDelete: Restrict)
  instrument       Instrument   @relation(fields: [instrumentId], references: [id], onDelete: Restrict)
  events           OrderEvent[]
  trades           Trade[]

  @@index([accountId])
  @@index([instrumentId])
  @@index([status])
  @@index([createdAt])
  @@index([providerId])
}

model OrderEvent {
  id          String      @id @default(uuid())
  orderId     String
  status      OrderStatus
  message     String?
  payload     Json?
  createdAt   DateTime    @default(now())

  order       Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([createdAt])
}

model Trade {
  id           String      @id @default(uuid()) // Internal Trade/Execution ID
  providerId   String?     // External execution ID
  orderId      String
  accountId    String
  instrumentId String
  side         OrderSide
  price        Decimal     @db.Decimal(28, 8)
  quantity     Decimal     @db.Decimal(28, 8)
  fee          Decimal     @default(0.0) @db.Decimal(28, 8)
  feeCurrency  String      @default("USD")
  realizedPnl  Decimal     @default(0.0) @db.Decimal(28, 8)
  executedAt   DateTime    @default(now())

  order        Order       @relation(fields: [orderId], references: [id], onDelete: Restrict)
  account      Account     @relation(fields: [accountId], references: [id], onDelete: Restrict)
  instrument   Instrument  @relation(fields: [instrumentId], references: [id], onDelete: Restrict)

  @@index([orderId])
  @@index([accountId])
  @@index([instrumentId])
  @@index([executedAt])
}

enum PositionSide {
  LONG
  SHORT
}

model Position {
  id               String       @id @default(uuid())
  accountId        String
  instrumentId     String
  side             PositionSide
  quantity         Decimal      @db.Decimal(28, 8)
  entryPrice       Decimal      @db.Decimal(28, 8)
  currentPrice     Decimal      @db.Decimal(28, 8)
  unrealizedPnl    Decimal      @default(0.0) @db.Decimal(28, 8)
  realizedPnl      Decimal      @default(0.0) @db.Decimal(28, 8)
  margin           Decimal      @db.Decimal(28, 8)
  leverage         Int          @default(100)
  liquidationPrice Decimal?     @db.Decimal(28, 8)
  stopLoss         Decimal?     @db.Decimal(28, 8)
  takeProfit       Decimal?     @db.Decimal(28, 8)
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  account          Account      @relation(fields: [accountId], references: [id], onDelete: Restrict)
  instrument       Instrument   @relation(fields: [instrumentId], references: [id], onDelete: Restrict)

  @@unique([accountId, instrumentId, side])
  @@index([accountId])
  @@index([instrumentId])
}

// -------------------------------------------------------------
// FINANCIAL MOVEMENTS & WALLET DOMAIN
// -------------------------------------------------------------

enum TransactionType {
  DEPOSIT
  WITHDRAWAL
  TRADE_COMMISSION
  REALIZED_PNL
  TRANSFER
  ADJUSTMENT
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

model Transaction {
  id           String          @id @default(uuid())
  accountId    String
  type         TransactionType
  amount       Decimal         @db.Decimal(28, 8) // Positive for credits, negative for debits
  currency     String          @default("USD")
  balanceAfter Decimal         @db.Decimal(28, 8)
  referenceId  String?         // Reference to Order, Deposit, or Withdrawal ID
  description  String?
  createdAt    DateTime        @default(now())

  account      Account         @relation(fields: [accountId], references: [id], onDelete: Restrict)

  @@index([accountId])
  @@index([type])
  @@index([createdAt])
}

model Deposit {
  id            String        @id @default(uuid())
  accountId     String
  providerId    String?       // Payment Gateway Transaction ID
  paymentMethod String        // e.g. "STRIPE", "COINBASE_COMMERCE", "BANK_WIRE"
  amount        Decimal       @db.Decimal(28, 8)
  fee           Decimal       @default(0.0) @db.Decimal(28, 8)
  currency      String        @default("USD")
  status        PaymentStatus @default(PENDING)
  metadata      Json?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  account       Account       @relation(fields: [accountId], references: [id], onDelete: Restrict)

  @@index([accountId])
  @@index([status])
}

model Withdrawal {
  id              String        @id @default(uuid())
  accountId       String
  providerId      String?
  paymentMethod   String
  amount          Decimal       @db.Decimal(28, 8)
  fee             Decimal       @default(0.0) @db.Decimal(28, 8)
  currency        String        @default("USD")
  destinationInfo Json          // Redacted payment details (e.g. Last4 of account / Crypto address)
  status          PaymentStatus @default(PENDING)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  account         Account       @relation(fields: [accountId], references: [id], onDelete: Restrict)

  @@index([accountId])
  @@index([status])
}

// -------------------------------------------------------------
// NOTIFICATIONS & AUDITING DOMAIN
// -------------------------------------------------------------

model Notification {
  id        String   @id @default(uuid())
  userId    String
  title     String
  message   String
  type      String   // "ORDER", "MARGIN_CALL", "SECURITY", "SYSTEM"
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([isRead])
  @@index([createdAt])
}

model AuditLog {
  id          String   @id @default(uuid())
  userId      String?
  action      String   // e.g., "ORDER_CREATE", "WITHDRAWAL_REQUEST", "LOGIN_ATTEMPT"
  ipAddress   String?
  userAgent   String?
  requestData Json?    // Strictly redacted payload
  responseData Json?   // Redacted provider response
  statusCode  Int?
  result      String   // "SUCCESS" or "FAILURE"
  createdAt   DateTime @default(now())

  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```
