# System Boundaries: External Provider Dependencies vs. Local Implementations

## 1. Overview Matrix

In a production-grade trading architecture, certain functions are legally, financially, and technically bound to regulated external counter-parties, while other core functions must be executed entirely within our own high-performance local infrastructure.

| Functional Component | External Provider Required? | Local Implementation Scope | External Provider Scope |
| :--- | :---: | :--- | :--- |
| **Real-Time Ticker & Price Quotes** | **Yes** (in Live/Paper) | Subscription multiplexer, client WebSocket broadcast, tick throttle, spread markup | Authoritative external matching engine price ticks (e.g. Binance WS / Alpaca / OANDA) |
| **Level 2 Order Book (Market Depth)** | **Yes** (in Live/Paper) | L2 delta aggregator, order book visualizer, depth chart renderer | Raw exchange bids/asks snapshot & diff streams |
| **Historical Candlestick Bars (OHLCV)** | **Yes** (in Live/Paper) | Candle caching in DB/Redis, local bar generation from incoming ticks | Historical archive REST API |
| **Pre-Trade Risk & Margin Checks** | **No** (Local) | Leverage checking, margin formula calculation, notional limits, SL/TP validation | None (Must run locally before external routing) |
| **Order Matching & Paper Execution** | **No** (Local Paper Engine) | Simulated matching engine, fill latency emulator, slippage modeling | Only when in LIVE mode |
| **Live Order Execution** | **Yes** (in Live Mode) | Request signing, idempotency keys, order state machine, DB tracking | External broker order submission, ECN matching, broker order IDs |
| **Portfolio & Account Margin Balance** | **Hybrid** | Local cash ledger, unrealized P&L recalculation, margin level warnings, liquidation triggers | External broker custodial balance reconciliation |
| **User Authentication & RBAC** | **No** (Local) | Argon2 password hashing, TOTP 2FA, session tokens, HTTP-only cookies, role guards | Optional OAuth/SSO if desired |
| **Deposits & Fiat/Crypto Funding** | **Yes** | Deposit intent creation, webhook signature verification, balance crediting | Payment processing (Stripe, Adyen, Coinbase Commerce, Bank Wire clearing) |
| **Withdrawals & Payouts** | **Yes** | Internal balance lock, withdrawal request approval workflow, audit trail | Gateway payout API, blockchain transaction broadcast |
| **Charting Engine & Technical Indicators** | **No** (Local) | Canvas/WebGL rendering, 100+ indicators (RSI, MACD, EMA, Bollinger, VWAP), drawing tools | None |
| **Watchlist Management** | **No** (Local) | CRUD watchlists, custom sort order, user preferences in DB | None |
| **Audit Logging & System Auditing** | **No** (Local) | Immutable log of all financial events, IP/user agent recording, DB constraints | None |

---

## 2. Detailed Breakdown: External Provider Dependencies

### 2.1 Live Market Data (L1 & L2)
- **Why External**: Market prices cannot be fabricated in a real platform. Real buyers and sellers in the global market establish the bid/ask and order book.
- **Protocol**: Direct WSS connection to licensed providers (e.g., Binance WebSocket stream `wss://stream.binance.com:9443/ws`, Alpaca Market Data WSS `wss://stream.data.alpaca.markets/v2/sip`).
- **Failure Handling**: If the external feed disconnects, the system sets symbol status to `STALE_DATA` and alerts connected clients; orders are held from submission until healthy heartbeat resumes.

### 2.2 Live Broker Execution & Clearing
- **Why External**: Only a licensed broker/dealer or registered exchange holds regulatory authority to clear transactions against market liquidity and hold customer custodial assets.
- **Protocol**: Signed HTTPS REST API calls (HMAC SHA-256 or RSA keypairs) with strict client-generated `clientOrderId` to prevent duplicate submissions.
- **Failure Handling**: If the broker responds with HTTP 429 (Rate Limit) or HTTP 5xx, the OMS marks the order as `REJECTED` or `PENDING_RECONCILIATION` and alerts the user with human-readable error messages.

### 2.3 Fiat & Crypto Payments (Deposits/Withdrawals)
- **Why External**: Platforms cannot process credit cards or ACH transfers without PCI-DSS compliance and banking licenses.
- **Protocol**: Hosted payment intents (e.g., Stripe PaymentIntents or Coinbase Commerce Webhooks) where card numbers and CVVs never touch our server infrastructure.

---

## 3. Detailed Breakdown: Local Implementation Responsibilities

### 3.1 Local Paper Trading & Simulation Engine
- The platform includes a complete **High-Performance Simulated OMS** capable of executing orders against real-time live market ticks.
- Supports Market, Limit, Stop, and Stop-Limit orders.
- Emulates realistic execution slippage and maker/taker commissions.

### 3.2 Pre-Trade Risk Engine
- Calculates margin requirements in real time:
  $$\text{Used Margin} = \sum_{p \in \text{Positions}} \frac{\text{Qty}_p \times \text{Price}_p}{\text{Leverage}_p}$$
  $$\text{Free Margin} = \text{Equity} - \text{Used Margin}$$
- Automatically rejects orders when $\text{Free Margin} \le 0$ before sending anything to an external provider.

### 3.3 Financial Ledger & Double-Entry Integrity
- Every balance change is paired with an immutable entry in the `Transaction` table.
- Balances are updated via ACID transactions in PostgreSQL.
