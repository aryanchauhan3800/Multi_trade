// Production Express & WebSocket Server

import http from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { CompositeMarketDataProvider } from './providers/market-data/composite-market-data.js';
import { MarketWebSocketGateway } from './gateway/market-ws-gateway.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Initialize Market Data Layer
const marketData = new CompositeMarketDataProvider();
marketData.connect();

// Create HTTP Server
const server = http.createServer(app);

// Initialize WebSocket Gateway
const wsGateway = new MarketWebSocketGateway(server, marketData);

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// Health Probe
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    environment: process.env.ENVIRONMENT_MODE || 'PAPER_TRADING',
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

// Start Server
server.listen(port, () => {
  console.log(`[NEXUS SERVER] Running on http://localhost:${port}`);
  console.log(`[NEXUS SERVER] WebSocket Gateway available at ws://localhost:${port}/ws/market`);
});

export { server, app, marketData, wsGateway };
