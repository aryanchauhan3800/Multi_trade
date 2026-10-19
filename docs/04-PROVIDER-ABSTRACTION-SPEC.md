# Provider Abstraction Specification

## 1. Architectural Motivation & Decoupling

To prevent vendor lock-in and enable seamless switching between authorized liquidity venues, market data feeds, and payment gateways, the platform implements a pluggable provider abstraction layer:

```
                          ┌────────────────────────┐
                          │   DOMAIN APPLICATION   │
                          │   (OMS, Risk, Wallet)  │
                          └───────────┬────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│  MarketDataProvider   │ │    TradingProvider    │ │    PaymentProvider    │
│  (Tickers, Books,     │ │    (Orders, Fills,    │ │    (Deposits, Payouts,│
│   Candles, Trades)    │ │     Positions)        │ │     Webhooks)         │
└───────────┬───────────┘ └───────────┬───────────┘ └───────────┬───────────┘
            │                         │                         │
  ┌─────────┴─────────┐     ┌─────────┴─────────┐     ┌─────────┴─────────┐
  ▼                   ▼     ▼                   ▼     ▼                   ▼
BinanceProvider    Alpaca  AlpacaTrading    Binance  StripeAdapter   CoinbasePay
MarketDataFeed     OANDA   BrokerAdapter    Futures                  BankWire
```

---

## 2. Core Provider TypeScript Interfaces

### 2.1 MarketDataProvider Interface

```typescript
export interface TickerData {
  symbol: string;
  bid: number;
  ask: number;
  lastPrice: number;
  spread: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  change24h: number; // Percentage
  timestamp: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBookData {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradeFeedData {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  timestamp: number;
}

export interface MarketDataProvider {
  readonly name: string;
  readonly isConnected: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // REST Snapshots
  getTicker(symbol: string): Promise<TickerData>;
  getOrderBook(symbol: string, depth?: number): Promise<OrderBookData>;
  getCandles(symbol: string, timeframe: string, limit?: number): Promise<CandleData[]>;
  getTradableSymbols(): Promise<string[]>;

  // WebSocket Live Subscriptions
  subscribeTicker(symbol: string, callback: (ticker: TickerData) => void): () => void;
  subscribeOrderBook(symbol: string, callback: (book: OrderBookData) => void): () => void;
  subscribeTrades(symbol: string, callback: (trade: TradeFeedData) => void): () => void;
}
```

### 2.2 TradingProvider & BrokerProvider Interface

```typescript
export interface CreateOrderParams {
  clientOrderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  quantity: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface ProviderOrderResult {
  providerOrderId: string;
  clientOrderId: string;
  symbol: string;
  status: 'PENDING' | 'OPEN' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED';
  filledQuantity: number;
  averageFillPrice?: number;
  fee: number;
  feeCurrency: string;
  rejectionReason?: string;
  timestamp: number;
}

export interface ProviderPositionResult {
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  margin: number;
  liquidationPrice?: number;
}

export interface BrokerProvider {
  readonly name: string;
  readonly environment: 'DEVELOPMENT' | 'PAPER_TRADING' | 'LIVE';
  readonly isConnected: boolean;

  // Connection Lifecycle
  initialize(credentials: Record<string, string>): Promise<void>;
  testConnection(): Promise<boolean>;

  // Execution Methods
  submitOrder(order: CreateOrderParams): Promise<ProviderOrderResult>;
  cancelOrder(providerOrderId: string, symbol: string): Promise<boolean>;
  modifyOrder?(providerOrderId: string, symbol: string, updates: Partial<CreateOrderParams>): Promise<ProviderOrderResult>;

  // State Reconciliation
  getOrder(providerOrderId: string, symbol: string): Promise<ProviderOrderResult>;
  getOpenOrders(symbol?: string): Promise<ProviderOrderResult[]>;
  getPositions(): Promise<ProviderPositionResult[]>;

  // Private Execution Stream
  subscribeExecutionUpdates(callback: (event: ProviderOrderResult) => void): () => void;
}
```

### 2.3 AccountProvider Interface

```typescript
export interface AccountSummary {
  accountId: string;
  currency: string;
  totalBalance: number;
  availableBalance: number;
  equity: number;
  usedMargin: number;
  freeMargin: number;
  marginLevelPercentage: number;
  unrealizedPnl: number;
  realizedPnl: number;
}

export interface AccountProvider {
  getAccountSummary(accountId: string): Promise<AccountSummary>;
  getAccountLeverage(accountId: string): Promise<number>;
  setAccountLeverage(accountId: string, leverage: number): Promise<boolean>;
}
```

### 2.4 PaymentProvider Interface

```typescript
export interface DepositIntentParams {
  accountId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  successUrl: string;
  cancelUrl: string;
}

export interface DepositIntentResult {
  depositId: string;
  clientSecret?: string;
  checkoutUrl?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export interface WithdrawalParams {
  accountId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  destinationDetails: Record<string, any>; // Redacted details
}

export interface WithdrawalResult {
  withdrawalId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fee: number;
}

export interface PaymentProvider {
  readonly name: string;
  createDepositIntent(params: DepositIntentParams): Promise<DepositIntentResult>;
  verifyWebhook(signature: string, payload: Buffer): Promise<{ event: string; data: any }>;
  processWithdrawal(params: WithdrawalParams): Promise<WithdrawalResult>;
}
```

---

## 3. Concrete Provider Strategy: Legitimate APIs

For live production integration:
1. **Crypto & Spot/Perpetual Futures**: **Binance Official Public API (REST v3 + WebSocket)** or **Coinbase Advanced Trade API**.
   - Fully documented endpoints for L1/L2 data, public trade streams, and authenticated order management.
2. **Equities & Multi-Asset Paper/Live**: **Alpaca Markets Trading API v2**.
   - Fully documented, regulatory compliant broker API with explicit Paper Trading sandbox keys (`https://paper-api.alpaca.markets`) and Live keys (`https://api.alpaca.markets`).
3. **Forex & CFDs**: **OANDA REST-v20 API** (Documented developer endpoint for live streaming forex rates & practice accounts).

If live broker credentials are not configured in the host environment, the system strictly loads the **Mock/Paper Trading Provider**, which simulates execution with deterministic slippage and live or simulated ticks—clearly labeled **"PAPER TRADING"** in the UI.
