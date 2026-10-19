// Production Express & WebSocket Server with Order Engine & Broker Integration

import http from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { CompositeMarketDataProvider } from './providers/market-data/composite-market-data.js';
import { MarketWebSocketGateway } from './gateway/market-ws-gateway.js';
import { BrokerRouter } from './providers/broker/broker-router.js';
import { OrderEngine } from './engine/order-engine.js';
import { PaymentGateway } from './providers/payment/payment-gateway.js';
import { AuthService } from './auth/auth-service.js';
import { EnvironmentMode } from '@nexus/core';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const envMode: EnvironmentMode = (process.env.ENVIRONMENT_MODE as EnvironmentMode) || 'PAPER_TRADING';

app.use(cors({ origin: '*' }));
app.use(express.json());

// 1. Initialize Market Data Layer
const marketData = new CompositeMarketDataProvider();
marketData.connect();

// 2. Initialize Broker Router Layer
const broker = new BrokerRouter(marketData, envMode);
broker.initialize();

// In-Memory Audit Logs storage
const auditLogs: Array<{ id: string; time: string; action: string; details: string; status: 'SUCCESS' | 'WARNING' | 'ERROR' }> = [
  {
    id: `aud_boot_${Date.now()}`,
    time: new Date().toLocaleTimeString(),
    action: 'SERVER_BOOT',
    details: `Nexus Trading Platform started in ${envMode} mode. Broker: ${broker.name}.`,
    status: 'SUCCESS',
  },
];

// 3. Initialize Order Engine (OMS)
const orderEngine = new OrderEngine(broker, marketData, {
  onAuditLog: (log) => {
    auditLogs.unshift({
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      time: new Date().toLocaleTimeString(),
      action: log.action,
      details: log.details,
      status: log.status,
    });
  },
});

// 4. Initialize Payment & Custody Gateway
const paymentGateway = new PaymentGateway();

// 5. Initialize Security & Authentication Engine
const authService = new AuthService();

// 6. Create HTTP Server & WebSocket Gateway
const server = http.createServer(app);
const wsGateway = new MarketWebSocketGateway(server, marketData);

// -------------------------------------------------------------
// AUTHENTICATION & IDENTITY ENDPOINTS
// -------------------------------------------------------------

// Register New Trader Account
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;
    const result = authService.register(email, password, role);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Authenticate / Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = authService.login(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

// Current Authenticated Session
app.get('/api/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }
  const token = authHeader.substring(7);
  const session = authService.verifyToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
  res.json({ session });
});

// Logout Session
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    authService.logout(authHeader.substring(7));
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// System Health Probe
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    environment: envMode,
    brokerConnected: broker.isConnected,
    marketDataConnected: marketData.isConnected,
    timestamp: Date.now(),
  });
});

// Tradable Instruments List
app.get('/api/instruments', async (_req: Request, res: Response) => {
  try {
    const symbols = await marketData.getTradableSymbols();
    res.json({ symbols });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Snapshot of all Tickers
app.get('/api/markets/tickers', async (_req: Request, res: Response) => {
  try {
    const symbols = await marketData.getTradableSymbols();
    const tickerPromises = symbols.map((s) => marketData.getTicker(s).catch(() => null));
    const tickers = (await Promise.all(tickerPromises)).filter(Boolean);
    res.json({ tickers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Single Ticker
app.get('/api/markets/ticker/:symbol', async (req: Request, res: Response) => {
  try {
    const ticker = await marketData.getTicker(req.params.symbol.toUpperCase());
    res.json(ticker);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Order Book Snapshot
app.get('/api/markets/orderbook/:symbol', async (req: Request, res: Response) => {
  try {
    const depth = parseInt(req.query.depth as string, 10) || 10;
    const book = await marketData.getOrderBook(req.params.symbol.toUpperCase(), depth);
    res.json(book);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Candlesticks (OHLCV)
app.get('/api/markets/candles/:symbol', async (req: Request, res: Response) => {
  try {
    const timeframe = (req.query.timeframe as string) || '15m';
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const candles = await marketData.getCandles(req.params.symbol.toUpperCase(), timeframe, limit);
    res.json({ candles });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// ORDER MANAGEMENT (OMS) & TRADING ENDPOINTS
// -------------------------------------------------------------

// Submit Order (Risk Checked & Broker Dispatched)
app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const { symbol, side, type, quantity, price, stopLoss, takeProfit } = req.body;

    const order = await orderEngine.submitOrder({
      accountId: 'acc_default',
      userId: 'usr_default',
      symbol: symbol.toUpperCase(),
      side,
      type,
      quantity: parseFloat(quantity),
      price: price ? parseFloat(price) : undefined,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
    });

    res.status(201).json({ order });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Order rejected by risk engine' });
  }
});

// Cancel Working Order
app.delete('/api/orders/:id', async (req: Request, res: Response) => {
  try {
    const success = await orderEngine.cancelOrder(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Order not found or already terminal' });
    }
    res.json({ success: true, message: 'Order successfully cancelled' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Open / Working Orders
app.get('/api/orders/open', (_req: Request, res: Response) => {
  res.json({ orders: orderEngine.getOpenOrders() });
});

// Get Order History
app.get('/api/orders/history', (_req: Request, res: Response) => {
  res.json({ orders: orderEngine.getOrderHistory() });
});

// -------------------------------------------------------------
// POSITIONS & ACCOUNT ENDPOINTS
// -------------------------------------------------------------

// Get Active Positions
app.get('/api/positions', (_req: Request, res: Response) => {
  res.json({ positions: orderEngine.getPositions() });
});

// Close Position at Market Price
app.delete('/api/positions/:id', async (req: Request, res: Response) => {
  try {
    await orderEngine.closePosition(req.params.id);
    res.json({ success: true, message: 'Position closed at market price' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update Position Risk Levels (SL / TP)
app.patch('/api/positions/:id', async (req: Request, res: Response) => {
  try {
    const { stopLoss, takeProfit } = req.body;
    const position = await orderEngine.updatePosition(req.params.id, {
      stopLoss: stopLoss !== undefined ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit !== undefined ? parseFloat(takeProfit) : undefined,
    });
    res.json({ success: true, position });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Account Financial Summary (Balance, Equity, Margin, Free Margin)
app.get('/api/account/summary', (_req: Request, res: Response) => {
  res.json(orderEngine.getAccountBalance('acc_default'));
});

// Trade Execution History
app.get('/api/account/trades', (_req: Request, res: Response) => {
  res.json({ trades: orderEngine.getTrades() });
});

// Immutable Financial Audit Logs
app.get('/api/account/audit-logs', (_req: Request, res: Response) => {
  res.json({ auditLogs });
});

// -------------------------------------------------------------
// WALLET & FINANCIAL CUSTODY ENDPOINTS
// -------------------------------------------------------------

// Create Deposit Intent & Credit Account
app.post('/api/wallet/deposit', async (req: Request, res: Response) => {
  try {
    const { amount, method } = req.body;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Deposit amount must be a positive number' });
    }

    const intent = await paymentGateway.createDepositIntent({
      accountId: 'acc_default',
      amount: numAmount,
      currency: 'USD',
      method: method || 'STRIPE',
    });

    // In sandbox / instant mode, credit immediately
    if (intent.status === 'COMPLETED') {
      const txn = orderEngine.deposit('acc_default', numAmount, method || 'STRIPE', intent.intentId);
      return res.status(200).json({ success: true, intent, transaction: txn });
    }

    res.status(200).json({ success: true, intent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Request Account Withdrawal
app.post('/api/wallet/withdraw', (req: Request, res: Response) => {
  try {
    const { amount, method, destination } = req.body;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Withdrawal amount must be a positive number' });
    }
    if (!destination) {
      return res.status(400).json({ error: 'Destination account/address is required' });
    }

    const txn = orderEngine.withdraw('acc_default', numAmount, method || 'STRIPE', destination);
    res.status(200).json({ success: true, transaction: txn });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get Wallet Transactions
app.get('/api/wallet/transactions', (_req: Request, res: Response) => {
  res.json({ transactions: orderEngine.getTransactions('acc_default') });
});

// -------------------------------------------------------------
// ADMIN & RISK MANAGEMENT ENDPOINTS
// -------------------------------------------------------------

// Admin System Overview
app.get('/api/admin/overview', (_req: Request, res: Response) => {
  const acc = orderEngine.getAccountBalance('acc_default');
  const positions = orderEngine.getPositions();
  const openOrders = orderEngine.getOpenOrders();

  res.json({
    status: 'HEALTHY',
    environment: envMode,
    broker: {
      name: broker.name,
      connected: broker.isConnected,
    },
    marketData: {
      connected: marketData.isConnected,
    },
    metrics: {
      totalBalance: acc.totalBalance,
      equity: acc.equity,
      usedMargin: acc.usedMargin,
      freeMargin: acc.freeMargin,
      marginLevel: acc.marginLevel,
      openPositionsCount: positions.length,
      openOrdersCount: openOrders.length,
      totalVolumeNotional: positions.reduce((sum, p) => sum + p.quantity * p.currentPrice, 0),
      totalAuditLogs: auditLogs.length,
    },
    activePositions: positions,
  });
});

// Emergency Circuit Breaker: Halt & Liquidate All
app.post('/api/admin/circuit-breaker', async (req: Request, res: Response) => {
  try {
    const reason = req.body.reason || 'Admin emergency halt initiated';
    const closedCount = await orderEngine.forceCloseAllPositions(reason);
    res.json({ success: true, closedPositionsCount: closedCount, message: `Circuit breaker activated: ${closedCount} positions closed.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Balance Override (Testing / Adjustment)
app.post('/api/admin/adjust-balance', (req: Request, res: Response) => {
  try {
    const { amount, accountId = 'acc_default' } = req.body;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({ error: 'Valid balance amount required' });
    }
    orderEngine.setAccountBalance(accountId, numAmount);
    res.json({ success: true, newBalance: numAmount });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Start Server
server.listen(port, () => {
  console.log(`[NEXUS SERVER] Running on http://localhost:${port}`);
  console.log(`[NEXUS SERVER] WebSocket Gateway available at ws://localhost:${port}/ws/market`);
});

export { server, app, marketData, broker, orderEngine, wsGateway };
