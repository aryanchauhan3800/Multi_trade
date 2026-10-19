// WebSocket Event Protocols and Channels

import { TickerData, OrderBookData, TradeFeedData } from '../providers/index.js';
import { Order, Position, AccountPortfolioSummary } from '../types/index.js';

export type WebSocketChannel =
  | `ticker:${string}`
  | `orderbook:${string}`
  | `trades:${string}`
  | `candles:${string}:${string}`
  | 'account:orders'
  | 'account:positions'
  | 'account:portfolio'
  | 'account:notifications';

export interface ClientSubscribeMessage {
  action: 'subscribe' | 'unsubscribe' | 'ping';
  channels?: WebSocketChannel[];
  token?: string; // Optional JWT for private account channels
}

export type ServerWebSocketMessage =
  | { event: 'pong'; timestamp: number }
  | { event: 'subscribed'; channels: WebSocketChannel[] }
  | { event: 'unsubscribed'; channels: WebSocketChannel[] }
  | { event: 'error'; message: string; code?: string }
  | { event: 'ticker.update'; data: TickerData }
  | { event: 'orderbook.update'; data: OrderBookData }
  | { event: 'trade.update'; data: TradeFeedData }
  | { event: 'order.created'; data: Order }
  | { event: 'order.updated'; data: Order }
  | { event: 'order.filled'; data: Order }
  | { event: 'order.cancelled'; data: Order }
  | { event: 'position.updated'; data: Position }
  | { event: 'portfolio.updated'; data: AccountPortfolioSummary }
  | { event: 'notification.created'; data: { id: string; title: string; message: string; type: string; createdAt: string } };
