// Provider Interface Abstractions

import { OrderSide, OrderType, OrderStatus, PositionSide, EnvironmentMode } from '../types/index.js';

export interface TickerData {
  symbol: string;
  bid: number;
  ask: number;
  lastPrice: number;
  spread: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  change24h: number;
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
  side: OrderSide;
  timestamp: number;
}

/**
 * Pluggable Market Data Feed Provider
 */
export interface MarketDataProvider {
  readonly name: string;
  readonly isConnected: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;

  getTicker(symbol: string): Promise<TickerData>;
  getOrderBook(symbol: string, depth?: number): Promise<OrderBookData>;
  getCandles(symbol: string, timeframe: string, limit?: number): Promise<CandleData[]>;
  getTradableSymbols(): Promise<string[]>;

  subscribeTicker(symbol: string, callback: (ticker: TickerData) => void): () => void;
  subscribeOrderBook(symbol: string, callback: (book: OrderBookData) => void): () => void;
  subscribeTrades(symbol: string, callback: (trade: TradeFeedData) => void): () => void;
}

export interface CreateOrderParams {
  clientOrderId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface ProviderOrderResult {
  providerOrderId: string;
  clientOrderId: string;
  symbol: string;
  status: OrderStatus;
  filledQuantity: number;
  averageFillPrice?: number;
  fee: number;
  feeCurrency: string;
  rejectionReason?: string;
  timestamp: number;
}

export interface ProviderPositionResult {
  symbol: string;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  margin: number;
  liquidationPrice?: number;
}

/**
 * Pluggable Broker / Exchange Trading Execution Provider
 */
export interface BrokerProvider {
  readonly name: string;
  readonly environment: EnvironmentMode;
  readonly isConnected: boolean;

  initialize(credentials?: Record<string, string>): Promise<void>;
  testConnection(): Promise<boolean>;

  submitOrder(order: CreateOrderParams): Promise<ProviderOrderResult>;
  cancelOrder(providerOrderId: string, symbol: string): Promise<boolean>;
  modifyOrder?(providerOrderId: string, symbol: string, updates: Partial<CreateOrderParams>): Promise<ProviderOrderResult>;

  getOrder(providerOrderId: string, symbol: string): Promise<ProviderOrderResult>;
  getOpenOrders(symbol?: string): Promise<ProviderOrderResult[]>;
  getPositions(): Promise<ProviderPositionResult[]>;

  subscribeExecutionUpdates(callback: (event: ProviderOrderResult) => void): () => void;
}

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
  destinationDetails: Record<string, any>;
}

export interface WithdrawalResult {
  withdrawalId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fee: number;
}

/**
 * Pluggable Payment & Fiat/Crypto Gateway Provider
 */
export interface PaymentProvider {
  readonly name: string;
  createDepositIntent(params: DepositIntentParams): Promise<DepositIntentResult>;
  verifyWebhook(signature: string, payload: Uint8Array | string): Promise<{ event: string; data: any }>;
  processWithdrawal(params: WithdrawalParams): Promise<WithdrawalResult>;
}
