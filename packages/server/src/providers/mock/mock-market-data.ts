// Mock Market Data Provider for Development and Testing

import {
  MarketDataProvider,
  TickerData,
  OrderBookData,
  CandleData,
  TradeFeedData,
} from '@nexus/core';

export class MockMarketDataProvider implements MarketDataProvider {
  public readonly name = 'MockMarketDataProvider';
  public isConnected = false;

  private tickers: Map<string, TickerData> = new Map();
  private subscribers: Map<string, Set<(t: TickerData) => void>> = new Map();
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.seedInitialTickers();
  }

  private seedInitialTickers(): void {
    const defaultSymbols: Array<{ symbol: string; price: number; spread: number }> = [
      { symbol: 'BTCUSD', price: 94820.5, spread: 0.6 },
      { symbol: 'ETHUSD', price: 3420.2, spread: 0.15 },
      { symbol: 'SOLUSD', price: 102.5, spread: 0.05 },
      { symbol: 'BNBUSD', price: 615.0, spread: 0.2 },
      { symbol: 'XRPUSD', price: 2.35, spread: 0.001 },
      { symbol: 'DOGEUSD', price: 0.38, spread: 0.0002 },
      { symbol: 'ADAUSD', price: 0.85, spread: 0.0005 },
      { symbol: 'AVAXUSD', price: 38.5, spread: 0.02 },
      { symbol: 'LINKUSD', price: 18.2, spread: 0.01 },
      { symbol: 'DOTUSD', price: 8.4, spread: 0.005 },
      { symbol: 'NEARUSD', price: 6.8, spread: 0.004 },
      { symbol: 'EURUSD', price: 1.0842, spread: 0.0001 },
      { symbol: 'GBPUSD', price: 1.2985, spread: 0.00015 },
      { symbol: 'USDJPY', price: 154.6, spread: 0.015 },
      { symbol: 'XAUUSD', price: 4000.0, spread: 0.25 },
      { symbol: 'WTI', price: 103.2, spread: 0.03 },
      { symbol: 'AAPL', price: 347.725, spread: 0.04 },
      { symbol: 'NVDA', price: 210.96, spread: 0.05 },
      { symbol: 'SPX', price: 760.0, spread: 0.5 },
    ];

    const now = Date.now();
    for (const item of defaultSymbols) {
      const halfSpread = item.spread / 2;
      this.tickers.set(item.symbol, {
        symbol: item.symbol,
        bid: Number((item.price - halfSpread).toFixed(5)),
        ask: Number((item.price + halfSpread).toFixed(5)),
        lastPrice: item.price,
        spread: item.spread,
        volume24h: 15420.5,
        high24h: item.price * 1.025,
        low24h: item.price * 0.985,
        change24h: 1.34,
        timestamp: now,
      });
    }
  }

  public async connect(): Promise<void> {
    this.isConnected = true;
    this.startPriceSimulation();
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private startPriceSimulation(): void {
    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(() => {
      if (!this.isConnected) return;

      for (const [symbol, ticker] of this.tickers.entries()) {
        // Random brownian walk between -0.05% and +0.05%
        const deltaPct = (Math.random() - 0.495) * 0.001;
        const newPrice = Number((ticker.lastPrice * (1 + deltaPct)).toFixed(5));
        const halfSpread = ticker.spread / 2;

        const updatedTicker: TickerData = {
          ...ticker,
          lastPrice: newPrice,
          bid: Number((newPrice - halfSpread).toFixed(5)),
          ask: Number((newPrice + halfSpread).toFixed(5)),
          timestamp: Date.now(),
        };

        this.tickers.set(symbol, updatedTicker);

        const callbacks = this.subscribers.get(symbol);
        if (callbacks) {
          callbacks.forEach((cb) => cb(updatedTicker));
        }
      }
    }, 500); // 2 updates per second
  }

  public async getTicker(symbol: string): Promise<TickerData> {
    const sym = symbol.toUpperCase();
    let ticker = this.tickers.get(sym);
    if (!ticker) {
      // Create fallback ticker on the fly rather than crashing
      const fallbackPrice = 100.0;
      const spread = 0.05;
      ticker = {
        symbol: sym,
        bid: Number((fallbackPrice - spread / 2).toFixed(5)),
        ask: Number((fallbackPrice + spread / 2).toFixed(5)),
        lastPrice: fallbackPrice,
        spread,
        volume24h: 15420.5,
        high24h: fallbackPrice * 1.025,
        low24h: fallbackPrice * 0.985,
        change24h: 0.85,
        timestamp: Date.now(),
      };
      this.tickers.set(sym, ticker);
    }
    return { ...ticker };
  }

  public async getOrderBook(symbol: string, depth = 10): Promise<OrderBookData> {
    const ticker = await this.getTicker(symbol);
    const bids = [];
    const asks = [];

    for (let i = 0; i < depth; i++) {
      const step = ticker.spread * (i + 1);
      bids.push({
        price: Number((ticker.bid - step).toFixed(5)),
        quantity: Number((Math.random() * 2 + 0.1).toFixed(2)),
      });
      asks.push({
        price: Number((ticker.ask + step).toFixed(5)),
        quantity: Number((Math.random() * 2 + 0.1).toFixed(2)),
      });
    }

    return {
      symbol,
      bids,
      asks,
      timestamp: Date.now(),
    };
  }

  public async getCandles(symbol: string, timeframe: string = '15m', limit = 100): Promise<CandleData[]> {
    const ticker = await this.getTicker(symbol);
    const candles: CandleData[] = [];
    let currentPrice = ticker.lastPrice;

    const tfMinutes: Record<string, number> = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '1h': 60,
      '4h': 240,
      '1d': 1440,
      '1w': 10080,
    };
    const intervalMs = (tfMinutes[timeframe.toLowerCase()] || 15) * 60 * 1000;
    const now = Date.now();

    // Generate historical candles backwards from current price so the latest candle is 100% in sync
    for (let i = 0; i < limit; i++) {
      const time = now - i * intervalMs;
      const variation = (Math.random() - 0.49) * (ticker.lastPrice * 0.002);
      const close = currentPrice;
      const open = close - variation;
      const high = Math.max(open, close) + Math.random() * (ticker.lastPrice * 0.001);
      const low = Math.min(open, close) - Math.random() * (ticker.lastPrice * 0.001);
      const volume = Math.random() * 25 + 2;

      candles.push({
        timestamp: time,
        open: Number(open.toFixed(5)),
        high: Number(high.toFixed(5)),
        low: Number(low.toFixed(5)),
        close: Number(close.toFixed(5)),
        volume: Number(volume.toFixed(2)),
      });

      currentPrice = open;
    }

    // Chronological order: oldest to most recent
    return candles.reverse();
  }

  public async getTradableSymbols(): Promise<string[]> {
    return Array.from(this.tickers.keys());
  }

  public subscribeTicker(symbol: string, callback: (ticker: TickerData) => void): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    this.subscribers.get(symbol)!.add(callback);

    // Immediately trigger with current price if available
    const current = this.tickers.get(symbol);
    if (current) callback(current);

    return () => {
      const set = this.subscribers.get(symbol);
      if (set) {
        set.delete(callback);
      }
    };
  }

  public subscribeOrderBook(symbol: string, callback: (book: OrderBookData) => void): () => void {
    const interval = setInterval(async () => {
      if (this.isConnected) {
        const book = await this.getOrderBook(symbol);
        callback(book);
      }
    }, 1000);

    return () => clearInterval(interval);
  }

  public subscribeTrades(symbol: string, callback: (trade: TradeFeedData) => void): () => void {
    const interval = setInterval(async () => {
      if (this.isConnected) {
        const ticker = await this.getTicker(symbol);
        callback({
          id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          symbol,
          price: ticker.lastPrice,
          quantity: Number((Math.random() * 0.5 + 0.01).toFixed(3)),
          side: Math.random() > 0.5 ? 'BUY' : 'SELL',
          timestamp: Date.now(),
        });
      }
    }, 800);

    return () => clearInterval(interval);
  }
}
