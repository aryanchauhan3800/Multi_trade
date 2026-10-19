# Trading Terminal Wireframe & Interaction Layouts

## 1. Desktop Multi-Pane Terminal Wireframe

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [NEXUS EXCHANGE] [PAPER TRADING ▼]  EUR/USD 1.0842 ▲+0.2%  BTC/USD $94,820 ▲+1.5%   │ $100,000.00 USD [Deposit] [ Aryan ▼]│
├────────────────────┬─────────────────────────────────────────────────────────────────────┬─────────────────────────────┤
│ MARKETS & WATCHLIST│ CHART & EXECUTION CANVAS                                            │ ORDER ENTRY                 │
├────────────────────┼─────────────────────────────────────────────────────────────────────┼─────────────────────────────┤
│ [Search Symbol Q ] │ BTC/USD • 15m ▼ • [Candles ▼] • [Indicators (5)] • [Draw ▼] [⚙] [⛶] │ [  BUY  $94,821 ] [SELL $94,820]
│ [All][FX][Crypto]  │ ─────────────────────────────────────────────────────────────────── │ ─────────────────────────── │
│ Symbol   Bid   Ask │ High: 95,420.00   Low: 93,890.00   Vol: 18.4K BTC   Spread: 0.60   │ Order Type: [ MARKET ▼    ] │
│ ────────────────── │                                                                     │                             │
│ BTCUSD  94820 94821│        |                                                            │ Quantity:   [ 0.10        ] │
│ EURUSD 1.0841 1.084│       ┌┴┐             ┌─┐                                           │ Units:      [ Lots / BTC  ] │
│ XAUUSD 2714.2 2714.│       │ │             │ │                                           │                             │
│ AAPL   232.10 232.1│       └┬┘             │ │                                           │ [✓] Take Profit: [ 96,500 ] │
│ NVDA   141.50 141.5│        │              └┬┘       ── [TP: +$167.90 (1.7%)] ────────── │     Est. Profit: +$167.90   │
│ GBPUSD 1.2980 1.298│                         │                                           │                             │
│ ETHUSD 3,420. 3,421│                         └─ [Entry Line: 0.10 BTC @ $94,821] ─────── │ [✓] Stop Loss:   [ 93,500 ] │
│                    │                                                                     │     Est. Loss:   -$132.10   │
│ [+ Add Watchlist]  │       ── [SL: -$132.10 (1.4%)] ──────────────────────────────────── │ ─────────────────────────── │
│                    │                                                                     │ Req Margin:  $189.64 (1:50) │
│                    │ ─────────────────────────────────────────────────────────────────── │ Est Fees:    $4.74          │
│                    │ RSI(14): 58.2  ●  MACD(12,26,9): +12.4  ●  Vol: 412 BTC              │ Avail Balance: $98,420.12   │
│                    │                                                                     │ ─────────────────────────── │
│                    │                                                                     │ [      BUY BTC/USD        ] │
├────────────────────┴─────────────────────────────────────────────────────────────────────┴─────────────────────────────┤
│ TABBED WORKSPACE: [Positions (2)] | [Open Orders (1)] | [Order History] | [Trade History] | [Account Activity]       │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Symbol   Side   Size     Entry Price   Current Price   SL        TP        Margin     Unrealized P&L   Actions         │
│ BTC/USD  LONG   0.10 BTC $94,821.00    $94,942.50      $93,500   $96,500   $189.64    +$12.15 (+6.4%)  [✏️ Edit] [✕ Close]│
│ EUR/USD  SHORT  1.00 Lot 1.08450       1.08410         1.08700   1.08100   $1,084.50  +$40.00 (+3.7%)  [✏️ Edit] [✕ Close]│
│                                                                                                                        │
│ Equity: $100,052.15 | Margin: $1,274.14 | Free Margin: $98,778.01 | Margin Level: 7,852% | Today's P&L: +$52.15      │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Desktop Order Confirmation Modal Overlay

Triggered when the user clicks **[ BUY BTC/USD ]** or **[ SELL BTC/USD ]** (unless one-click trading is toggled):

```
┌────────────────────────────────────────────────────────┐
│ Confirm Order Submission                     [✕ Esc]   │
├────────────────────────────────────────────────────────┤
│  🟢 BUY MARKET ORDER                                   │
│  BTC/USD • Spot / Margin                               │
│                                                        │
│  Quantity:          0.10 BTC                           │
│  Estimated Price:   $94,821.00 USD                     │
│  Estimated Cost:    $9,482.10 USD                      │
│  Required Margin:   $189.64 USD (Leverage 1:50)        │
│  Estimated Fees:    $4.74 USD                          │
│                                                        │
│  Take Profit:       $96,500.00 (+$167.90 / +1.77%)     │
│  Stop Loss:         $93,500.00 (-$132.10 / -1.39%)     │
│                                                        │
│  Execution Venue:   Paper Matching Engine (Zero Delay) │
│  Route Latency:     < 12ms                             │
├────────────────────────────────────────────────────────┤
│ [ ] Do not show confirmation again (One-Click Mode)    │
│                                                        │
│ [ Cancel ]                       [  Confirm Buy Order ]│
└────────────────────────────────────────────────────────┘
```

---

## 3. Dedicated Mobile Terminal Wireframe

Mobile screens do not squeeze desktop columns horizontally. Instead, they operate as a cohesive app shell with full-width views and responsive drawers:

```
┌──────────────────────────────────────┐
│ 09:41                5G  ● 98% [⚡]   │
├──────────────────────────────────────┤
│ NEXUS ▾ BTC/USD  $94,820.50  ▲ +1.5% │
├──────────────────────────────────────┤
│ [15m] [1H] [4H] [1D]    [Indicators] │
│                                      │
│               /\                     │
│        /\    /  \    /\              │
│       /  \  /    \  /  \  /\         │
│      /    \/      \/    \/           │
│                                      │
│                                      │
│ ──────────────────────────────────── │
│ Open Positions: 2     P&L: +$52.15   │
├──────────────────────────────────────┤
│  [     BUY $94,821     ]             │
│  [     SELL $94,820    ]             │
├──────────────────────────────────────┤
│ BOTTOM TAB NAVIGATION:               │
│ [📊 Markets] [⭐ Watchlist]           │
│ [📈 Trade]   [💼 Portfolio] [👤 Acc] │
└──────────────────────────────────────┘
```

### Mobile Order Entry Bottom Sheet (Slides Up on Tapping Buy/Sell):

```
┌──────────────────────────────────────┐
│ ─── (Drag Indicator) ─────────────── │
│ BUY BTC/USD                $94,821.00│
│                                      │
│ [ Market ]  [ Limit ]  [ Stop ]      │
│                                      │
│ Quantity (BTC):                      │
│ [ - ]        [ 0.10 ]          [ + ] │
│ Quick Lots:  [0.01] [0.05] [0.10] [0.5]
│                                      │
│ [✓] Take Profit:  [ $96,500.00     ] │
│ [✓] Stop Loss:    [ $93,500.00     ] │
│                                      │
│ Margin Req: $189.64 | Free: $98.7K   │
│                                      │
│ [       CONFIRM BUY ORDER          ] │
└──────────────────────────────────────┘
```
