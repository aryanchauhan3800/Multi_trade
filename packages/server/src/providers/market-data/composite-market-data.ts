// Composite Multi-Asset Market Data Provider
// Routes Crypto to Binance Real Stream, and Stocks/Commodities/Forex to Real Stock Market Data Layer.

import {
  MarketDataProvider,
  TickerData,
  OrderBookData,
  CandleData,
  TradeFeedData,
} from '@nexus/core';
import { BinanceMarketDataProvider } from './binance-market-data.js';
import { RealStockMarketDataProvider } from './real-stock-market-data.js';
import { MockMarketDataProvider } from '../mock/mock-market-data.js';

export class CompositeMarketDataProvider implements MarketDataProvider {
  public readonly name = 'CompositeMarketDataProvider';
  public isConnected = false;

  private binance: BinanceMarketDataProvider;
  private realStock: RealStockMarketDataProvider;
  private mock: MockMarketDataProvider;

  // Crypto symbols routed to Binance Live Gateway
  private cryptoSymbols = new Set([
    'BTCUSD',
    'ETHUSD',
    'SOLUSD',
    'BNBUSD',
    'XRPUSD',
    'DOGEUSD',
    'ADAUSD',
    'AVAXUSD',
    'LINKUSD',
    'DOTUSD',
    'NEARUSD',
  ]);

  // Stock, Commodity, Forex symbols routed to Real Stock Market Data Layer
  private realSymbols = new Set([
    'AAPL',
    'NVDA',
    'SPX',
    'EURUSD',
    'GBPUSD',
    'XAUUSD',
    'WTI',
  ]);

  constructor() {
    this.binance = new BinanceMarketDataProvider();
    this.realStock = new RealStockMarketDataProvider();
    this.mock = new MockMarketDataProvider();
  }

  public async connect(): Promise<void> {
    await Promise.allSettled([
      this.binance.connect(),
      this.realStock.connect(),
      this.mock.connect(),
    ]);
    this.isConnected = true;
  }

  public async disconnect(): Promise<void> {
    await Promise.allSettled([
      this.binance.disconnect(),
      this.realStock.disconnect(),
      this.mock.disconnect(),
    ]);
    this.isConnected = false;
  }

  private selectProvider(symbol: string): MarketDataProvider {
    if (this.cryptoSymbols.has(symbol) && this.binance.isConnected) {
      return this.binance;
    }
    if (this.realSymbols.has(symbol) && this.realStock.isConnected) {
      return this.realStock;
    }
    return this.mock;
  }

  public async getTicker(symbol: string): Promise<TickerData> {
    try {
      return await this.selectProvider(symbol).getTicker(symbol);
    } catch (_err) {
      // Fallback
      return await this.mock.getTicker(symbol);
    }
  }

  public async getOrderBook(symbol: string, depth = 10): Promise<OrderBookData> {
    try {
      return await this.selectProvider(symbol).getOrderBook(symbol, depth);
    } catch (_err) {
      return await this.mock.getOrderBook(symbol, depth);
    }
  }

  public async getCandles(symbol: string, timeframe = '15m', limit = 100): Promise<CandleData[]> {
    try {
      return await this.selectProvider(symbol).getCandles(symbol, timeframe, limit);
    } catch (_err) {
      return await this.mock.getCandles(symbol, timeframe, limit);
    }
  }

  public async getTradableSymbols(): Promise<string[]> {
    const binanceSymbols = await this.binance.getTradableSymbols().catch(() => []);
    const stockSymbols = await this.realStock.getTradableSymbols().catch(() => []);
    const mockSymbols = await this.mock.getTradableSymbols();
    return Array.from(new Set([...binanceSymbols, ...stockSymbols, ...mockSymbols]));
  }

  public subscribeTicker(symbol: string, callback: (ticker: TickerData) => void): () => void {
    const provider = this.selectProvider(symbol);
    return provider.subscribeTicker(symbol, callback);
  }

  public subscribeOrderBook(symbol: string, callback: (book: OrderBookData) => void): () => void {
    const provider = this.selectProvider(symbol);
    return provider.subscribeOrderBook(symbol, callback);
  }

  public subscribeTrades(symbol: string, callback: (trade: TradeFeedData) => void): () => void {
    const provider = this.selectProvider(symbol);
    return provider.subscribeTrades(symbol, callback);
  }
}
