// Pluggable Broker Router & Execution Dispatcher

import {
  BrokerProvider,
  CreateOrderParams,
  ProviderOrderResult,
  ProviderPositionResult,
  EnvironmentMode,
} from '@nexus/core';
import { AlpacaBrokerProvider } from './alpaca-broker.js';
import { MockBrokerProvider } from '../mock/mock-broker.js';
import { CompositeMarketDataProvider } from '../market-data/composite-market-data.js';

export class BrokerRouter implements BrokerProvider {
  public readonly name = 'BrokerRouter';
  public environment: EnvironmentMode;
  public isConnected = false;

  private alpaca: AlpacaBrokerProvider;
  private mock: MockBrokerProvider;

  constructor(marketData: any, environment: EnvironmentMode = 'PAPER_TRADING') {
    this.environment = environment;
    this.alpaca = new AlpacaBrokerProvider(environment);
    this.mock = new MockBrokerProvider(environment, marketData);
  }

  public async initialize(): Promise<void> {
    await this.mock.initialize();
    await this.alpaca.initialize().catch(() => {});

    // If Alpaca credentials are valid and tested, connect; otherwise fallback to Mock
    if (this.alpaca.isConnected) {
      this.isConnected = true;
    } else {
      this.isConnected = this.mock.isConnected;
    }
  }

  public async testConnection(): Promise<boolean> {
    return this.alpaca.isConnected || this.mock.isConnected;
  }

  private getActiveProvider(): BrokerProvider {
    if (this.environment === 'LIVE') {
      if (!this.alpaca.isConnected) {
        throw new Error('LIVE execution requires valid authorized broker credentials. Please configure ALPACA_API_KEY and ALPACA_API_SECRET.');
      }
      return this.alpaca;
    }

    // In PAPER_TRADING mode, use Alpaca Paper if available, otherwise local Mock
    if (this.alpaca.isConnected) {
      return this.alpaca;
    }
    return this.mock;
  }

  public async submitOrder(order: CreateOrderParams): Promise<ProviderOrderResult> {
    const provider = this.getActiveProvider();
    return provider.submitOrder(order);
  }

  public async cancelOrder(providerOrderId: string, symbol: string): Promise<boolean> {
    const provider = this.getActiveProvider();
    return provider.cancelOrder(providerOrderId, symbol);
  }

  public async getOrder(providerOrderId: string, symbol: string): Promise<ProviderOrderResult> {
    const provider = this.getActiveProvider();
    return provider.getOrder(providerOrderId, symbol);
  }

  public async getOpenOrders(symbol?: string): Promise<ProviderOrderResult[]> {
    const provider = this.getActiveProvider();
    return provider.getOpenOrders(symbol);
  }

  public async getPositions(): Promise<ProviderPositionResult[]> {
    const provider = this.getActiveProvider();
    return provider.getPositions();
  }

  public subscribeExecutionUpdates(callback: (event: ProviderOrderResult) => void): () => void {
    const p1 = this.alpaca.subscribeExecutionUpdates(callback);
    const p2 = this.mock.subscribeExecutionUpdates(callback);
    return () => {
      p1();
      p2();
    };
  }
}
