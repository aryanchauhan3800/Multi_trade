// Mock Broker Provider for Development and Paper Trading Mode

import {
  BrokerProvider,
  CreateOrderParams,
  ProviderOrderResult,
  ProviderPositionResult,
  EnvironmentMode,
  PositionSide,
} from '@nexus/core';
import { MockMarketDataProvider } from './mock-market-data.js';

export class MockBrokerProvider implements BrokerProvider {
  public readonly name = 'MockBrokerProvider';
  public readonly environment: EnvironmentMode;
  public isConnected = false;

  private orders: Map<string, ProviderOrderResult> = new Map();
  private positions: Map<string, ProviderPositionResult> = new Map();
  private executionSubscribers: Set<(e: ProviderOrderResult) => void> = new Set();

  constructor(
    environment: EnvironmentMode = 'PAPER_TRADING',
    private marketData: MockMarketDataProvider
  ) {
    this.environment = environment;
  }

  public async initialize(_credentials?: Record<string, string>): Promise<void> {
    this.isConnected = true;
  }

  public async testConnection(): Promise<boolean> {
    return this.isConnected;
  }

  public async submitOrder(order: CreateOrderParams): Promise<ProviderOrderResult> {
    if (!this.isConnected) {
      throw new Error('Broker provider is disconnected');
    }

    const providerOrderId = `mock_ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ticker = await this.marketData.getTicker(order.symbol);

    const executionPrice =
      order.side === 'BUY' ? ticker.ask : ticker.bid;

    // Simulate instant fill for MARKET orders, OPEN for LIMIT
    const isImmediate = order.type === 'MARKET';

    const result: ProviderOrderResult = {
      providerOrderId,
      clientOrderId: order.clientOrderId,
      symbol: order.symbol,
      status: isImmediate ? 'FILLED' : 'OPEN',
      filledQuantity: isImmediate ? order.quantity : 0,
      averageFillPrice: isImmediate ? executionPrice : undefined,
      fee: Number((order.quantity * executionPrice * 0.0005).toFixed(4)), // 5 bps fee
      feeCurrency: 'USD',
      timestamp: Date.now(),
    };

    this.orders.set(providerOrderId, result);

    if (isImmediate) {
      this.updateInternalPosition(order.symbol, order.side === 'BUY' ? 'LONG' : 'SHORT', order.quantity, executionPrice);
    }

    // Notify execution subscribers
    this.executionSubscribers.forEach((cb) => cb(result));

    return result;
  }

  public async cancelOrder(providerOrderId: string, _symbol: string): Promise<boolean> {
    const order = this.orders.get(providerOrderId);
    if (!order) return false;

    if (order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED') {
      order.status = 'CANCELLED';
      this.orders.set(providerOrderId, order);
      this.executionSubscribers.forEach((cb) => cb(order));
      return true;
    }
    return false;
  }

  public async getOrder(providerOrderId: string, _symbol: string): Promise<ProviderOrderResult> {
    const order = this.orders.get(providerOrderId);
    if (!order) throw new Error(`Order ${providerOrderId} not found`);
    return { ...order };
  }

  public async getOpenOrders(symbol?: string): Promise<ProviderOrderResult[]> {
    const all = Array.from(this.orders.values()).filter(
      (o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED'
    );
    if (symbol) {
      return all.filter((o) => o.symbol === symbol);
    }
    return all;
  }

  public async getPositions(): Promise<ProviderPositionResult[]> {
    return Array.from(this.positions.values());
  }

  public subscribeExecutionUpdates(callback: (event: ProviderOrderResult) => void): () => void {
    this.executionSubscribers.add(callback);
    return () => {
      this.executionSubscribers.delete(callback);
    };
  }

  private updateInternalPosition(
    symbol: string,
    side: PositionSide,
    quantity: number,
    fillPrice: number
  ): void {
    const key = `${symbol}_${side}`;
    const existing = this.positions.get(key);

    if (existing) {
      const totalQty = existing.quantity + quantity;
      const avgPrice =
        (existing.entryPrice * existing.quantity + fillPrice * quantity) / totalQty;
      existing.quantity = Number(totalQty.toFixed(4));
      existing.entryPrice = Number(avgPrice.toFixed(4));
      existing.currentPrice = fillPrice;
      existing.unrealizedPnl = 0;
      this.positions.set(key, existing);
    } else {
      this.positions.set(key, {
        symbol,
        side,
        quantity,
        entryPrice: fillPrice,
        currentPrice: fillPrice,
        unrealizedPnl: 0,
        margin: Number(((quantity * fillPrice) / 100).toFixed(4)), // 1:100 leverage
      });
    }
  }
}
