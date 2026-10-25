// Officially Documented Binance Public Market Data Provider (WebSocket & REST)

import WebSocket from 'ws';
import {
  MarketDataProvider,
  TickerData,
  OrderBookData,
  CandleData,
  TradeFeedData,
} from '@nexus/core';

export class BinanceMarketDataProvider implements MarketDataProvider {
  public readonly name = 'BinanceMarketDataProvider';
  public isConnected = false;

  private ws: WebSocket | null = null;
  private wsUrl = 'wss://stream.binance.com:9443/ws';
  private restUrl = 'https://api.binance.com/api/v3';

  private tickers: Map<string, TickerData> = new Map();
  private tickerSubscribers: Map<string, Set<(t: TickerData) => void>> = new Map();
  private bookSubscribers: Map<string, Set<(b: OrderBookData) => void>> = new Map();
  private tradeSubscribers: Map<string, Set<(tr: TradeFeedData) => void>> = new Map();

  private activeStreams: Set<string> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isClosing = false;

  // Supported crypto symbols mapped to Binance symbols (e.g. BTCUSD -> btcusdt)
  private symbolMapping: Record<string, string> = {
    BTCUSD: 'btcusdt',
    ETHUSD: 'ethusdt',
    SOLUSD: 'solusdt',
    BNBUSD: 'bnbusdt',
    XRPUSD: 'xrpusdt',
    DOGEUSD: 'dogeusdt',
    ADAUSD: 'adausdt',
    AVAXUSD: 'avaxusdt',
    LINKUSD: 'linkusdt',
    DOTUSD: 'dotusdt',
    NEARUSD: 'nearusdt',
  };

  private reverseMapping: Record<string, string> = {
    BTCUSDT: 'BTCUSD',
    ETHUSDT: 'ETHUSD',
    SOLUSDT: 'SOLUSD',
    BNBUSDT: 'BNBUSD',
    XRPUSDT: 'XRPUSD',
    DOGEUSDT: 'DOGEUSD',
    ADAUSDT: 'ADAUSD',
    AVAXUSDT: 'AVAXUSD',
    LINKUSDT: 'LINKUSD',
    DOTUSDT: 'DOTUSD',
    NEARUSDT: 'NEARUSD',
  };

  public async connect(): Promise<void> {
    if (this.isConnected && this.ws) return;
    this.isClosing = false;

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.on('open', () => {
          this.isConnected = true;
          // Resubscribe to existing active streams
          if (this.activeStreams.size > 0) {
            this.sendSubscribe(Array.from(this.activeStreams));
          }
          resolve();
        });

        this.ws.on('message', (raw: WebSocket.Data) => {
          this.handleMessage(raw.toString());
        });

        this.ws.on('error', (_err) => {
          this.isConnected = false;
        });

        this.ws.on('close', () => {
          this.isConnected = false;
          if (!this.isClosing) {
            this.scheduleReconnect();
          }
        });
      } catch (err) {
        this.isConnected = false;
        if (!this.isClosing) {
          this.scheduleReconnect();
        }
        resolve();
      }
    });
  }

  public async disconnect(): Promise<void> {
    this.isClosing = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  private scheduleReconnect(): void {
    if (this.isClosing || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  private toBinanceSymbol(symbol: string): string {
    return this.symbolMapping[symbol] || symbol.toLowerCase();
  }

  private toNexusSymbol(binanceSymbol: string): string {
    const upper = binanceSymbol.toUpperCase();
    return this.reverseMapping[upper] || upper;
  }

  private sendSubscribe(streams: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const msg = {
      method: 'SUBSCRIBE',
      params: streams,
      id: Date.now(),
    };
    this.ws.send(JSON.stringify(msg));
  }

  private handleMessage(payload: string): void {
    try {
      const data = JSON.parse(payload);

      // 1. Ticker Stream (24hr ticker: e.g. event "24hrTicker")
      if (data.e === '24hrTicker') {
        const symbol = this.toNexusSymbol(data.s);
        const lastPrice = parseFloat(data.c);
        const bid = parseFloat(data.b);
        const ask = parseFloat(data.a);
        const high24h = parseFloat(data.h);
        const low24h = parseFloat(data.l);
        const volume24h = parseFloat(data.v);
        const change24h = parseFloat(data.P);
        const spread = Number((ask - bid).toFixed(4));

        const ticker: TickerData = {
          symbol,
          lastPrice,
          bid,
          ask,
          spread,
          volume24h,
          high24h,
          low24h,
          change24h,
          timestamp: data.E,
        };

        this.tickers.set(symbol, ticker);
        const subs = this.tickerSubscribers.get(symbol);
        if (subs) {
          subs.forEach((cb) => cb(ticker));
        }
      }

      // 2. Depth / Order Book Stream
      if (data.lastUpdateId && data.bids && data.asks) {
        // Partial book depth
        const bids = data.bids.slice(0, 10).map((b: [string, string]) => ({
          price: parseFloat(b[0]),
          quantity: parseFloat(b[1]),
        }));
        const asks = data.asks.slice(0, 10).map((a: [string, string]) => ({
          price: parseFloat(a[0]),
          quantity: parseFloat(a[1]),
        }));

        // Broadcast to relevant book subscribers
        for (const [sym, subs] of this.bookSubscribers.entries()) {
          subs.forEach((cb) =>
            cb({
              symbol: sym,
              bids,
              asks,
              timestamp: Date.now(),
            })
          );
        }
      }

      // 3. Trade Stream
      if (data.e === 'trade') {
        const symbol = this.toNexusSymbol(data.s);
        const trade: TradeFeedData = {
          id: String(data.t),
          symbol,
          price: parseFloat(data.p),
          quantity: parseFloat(data.q),
          side: data.m ? 'SELL' : 'BUY', // Buyer is maker = SELL market order
          timestamp: data.T,
        };

        const subs = this.tradeSubscribers.get(symbol);
        if (subs) {
          subs.forEach((cb) => cb(trade));
        }
      }
    } catch (_err) {
      // Ignore parse errors on ping/ack
    }
  }

  public async getTicker(symbol: string): Promise<TickerData> {
    const cached = this.tickers.get(symbol);
    if (cached) return { ...cached };

    // Fetch via REST API
    const bSymbol = this.toBinanceSymbol(symbol).toUpperCase();
    const res = await fetch(`${this.restUrl}/ticker/24hr?symbol=${bSymbol}`);
    if (!res.ok) throw new Error(`Failed to fetch Binance ticker for ${symbol}`);
    const data = await res.json() as any;

    const lastPrice = parseFloat(data.lastPrice);
    const bid = parseFloat(data.bidPrice);
    const ask = parseFloat(data.askPrice);
    const ticker: TickerData = {
      symbol,
      lastPrice,
      bid,
      ask,
      spread: Number((ask - bid).toFixed(4)),
      volume24h: parseFloat(data.volume),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      change24h: parseFloat(data.priceChangePercent),
      timestamp: data.closeTime,
    };

    this.tickers.set(symbol, ticker);
    return ticker;
  }

  public async getOrderBook(symbol: string, depth = 10): Promise<OrderBookData> {
    const bSymbol = this.toBinanceSymbol(symbol).toUpperCase();
    const res = await fetch(`${this.restUrl}/depth?symbol=${bSymbol}&limit=${depth}`);
    if (!res.ok) throw new Error(`Failed to fetch Binance order book for ${symbol}`);
    const data = await res.json() as any;

    return {
      symbol,
      bids: data.bids.map((b: [string, string]) => ({
        price: parseFloat(b[0]),
        quantity: parseFloat(b[1]),
      })),
      asks: data.asks.map((a: [string, string]) => ({
        price: parseFloat(a[0]),
        quantity: parseFloat(a[1]),
      })),
      timestamp: Date.now(),
    };
  }

  public async getCandles(symbol: string, timeframe = '15m', limit = 100): Promise<CandleData[]> {
    const bSymbol = this.toBinanceSymbol(symbol).toUpperCase();
    const intervalMap: Record<string, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1H': '1h',
      '4H': '4h',
      '1D': '1d',
    };
    const interval = intervalMap[timeframe] || '15m';

    const urls = [
      `${this.restUrl}/klines?symbol=${bSymbol}&interval=${interval}&limit=${limit}`,
      `https://api.binance.us/api/v3/klines?symbol=${bSymbol}&interval=${interval}&limit=${limit}`,
      `https://data-api.binance.vision/api/v3/klines?symbol=${bSymbol}&interval=${interval}&limit=${limit}`,
    ];

    let rawCandles: any[][] | null = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
        if (res.ok) {
          rawCandles = (await res.json()) as any[][];
          if (Array.isArray(rawCandles) && rawCandles.length > 0) break;
        }
      } catch (_err) {
        continue;
      }
    }

    if (!rawCandles || !Array.isArray(rawCandles)) {
      throw new Error(`Failed to fetch Binance candles for ${symbol}`);
    }

    return rawCandles.map((c) => ({
      timestamp: c[0],
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5]),
    }));
  }

  public async getTradableSymbols(): Promise<string[]> {
    return Object.keys(this.symbolMapping);
  }

  public subscribeTicker(symbol: string, callback: (ticker: TickerData) => void): () => void {
    if (!this.tickerSubscribers.has(symbol)) {
      this.tickerSubscribers.set(symbol, new Set());
    }
    this.tickerSubscribers.get(symbol)!.add(callback);

    const bSymbol = this.toBinanceSymbol(symbol);
    const stream = `${bSymbol}@ticker`;
    if (!this.activeStreams.has(stream)) {
      this.activeStreams.add(stream);
      this.sendSubscribe([stream]);
    }

    // Trigger immediately if cached
    const cached = this.tickers.get(symbol);
    if (cached) callback(cached);

    return () => {
      const set = this.tickerSubscribers.get(symbol);
      if (set) set.delete(callback);
    };
  }

  public subscribeOrderBook(symbol: string, callback: (book: OrderBookData) => void): () => void {
    if (!this.bookSubscribers.has(symbol)) {
      this.bookSubscribers.set(symbol, new Set());
    }
    this.bookSubscribers.get(symbol)!.add(callback);

    const bSymbol = this.toBinanceSymbol(symbol);
    const stream = `${bSymbol}@depth20@100ms`;
    if (!this.activeStreams.has(stream)) {
      this.activeStreams.add(stream);
      this.sendSubscribe([stream]);
    }

    return () => {
      const set = this.bookSubscribers.get(symbol);
      if (set) set.delete(callback);
    };
  }

  public subscribeTrades(symbol: string, callback: (trade: TradeFeedData) => void): () => void {
    if (!this.tradeSubscribers.has(symbol)) {
      this.tradeSubscribers.set(symbol, new Set());
    }
    this.tradeSubscribers.get(symbol)!.add(callback);

    const bSymbol = this.toBinanceSymbol(symbol);
    const stream = `${bSymbol}@trade`;
    if (!this.activeStreams.has(stream)) {
      this.activeStreams.add(stream);
      this.sendSubscribe([stream]);
    }

    return () => {
      const set = this.tradeSubscribers.get(symbol);
      if (set) set.delete(callback);
    };
  }
}
