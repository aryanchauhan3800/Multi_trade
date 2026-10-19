// Alpaca Markets Official Trading API v2 Broker Provider
// Executes REAL stock and crypto orders directly against the Alpaca matching engine.

import {
  BrokerProvider,
  CreateOrderParams,
  ProviderOrderResult,
  ProviderPositionResult,
  EnvironmentMode,
  OrderStatus,
} from '@nexus/core';

export class AlpacaBrokerProvider implements BrokerProvider {
  public readonly name = 'AlpacaBrokerProvider';
  public environment: EnvironmentMode;
  public isConnected = false;

  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor(environment: EnvironmentMode = 'PAPER_TRADING') {
    this.environment = environment;
    this.apiKey = process.env.ALPACA_API_KEY || '';
    this.apiSecret = process.env.ALPACA_API_SECRET || '';

    // Choose base URL based on environment mode
    if (environment === 'LIVE') {
      this.baseUrl = process.env.ALPACA_LIVE_URL || 'https://api.alpaca.markets/v2';
    } else {
      this.baseUrl = process.env.ALPACA_PAPER_URL || 'https://paper-api.alpaca.markets/v2';
    }
  }

  public async initialize(credentials?: { apiKey?: string; apiSecret?: string; environment?: EnvironmentMode }): Promise<void> {
    if (credentials?.apiKey) this.apiKey = credentials.apiKey;
    if (credentials?.apiSecret) this.apiSecret = credentials.apiSecret;
    if (credentials?.environment) {
      this.environment = credentials.environment;
      this.baseUrl =
        credentials.environment === 'LIVE'
          ? process.env.ALPACA_LIVE_URL || 'https://api.alpaca.markets/v2'
          : process.env.ALPACA_PAPER_URL || 'https://paper-api.alpaca.markets/v2';
    }

    this.isConnected = await this.testConnection();
  }

  public async testConnection(): Promise<boolean> {
    if (!this.apiKey || !this.apiSecret) {
      this.isConnected = false;
      return false;
    }

    try {
      const res = await fetch(`${this.baseUrl}/account`, {
        headers: this.getHeaders(),
      });
      this.isConnected = res.ok;
      return res.ok;
    } catch (_err) {
      this.isConnected = false;
      return false;
    }
  }

  public async getAccountInfo(): Promise<any> {
    if (!this.apiKey || !this.apiSecret) return null;
    try {
      const res = await fetch(`${this.baseUrl}/account`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (_err) {
      return null;
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      'APCA-API-KEY-ID': this.apiKey,
      'APCA-API-SECRET-KEY': this.apiSecret,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  public async submitOrder(order: CreateOrderParams): Promise<ProviderOrderResult> {
    if (!this.isConnected) {
      throw new Error(`Alpaca Broker is not connected or API keys are unconfigured.`);
    }

    // Translate platform symbols to Alpaca symbols if necessary (e.g. SPX -> SPY)
    let executionSymbol = order.symbol;
    if (order.symbol === 'SPX') executionSymbol = 'SPY';

    // Alpaca uses lowercase sides (buy/sell) and types (market/limit/stop)
    const payload: any = {
      symbol: executionSymbol,
      qty: String(order.quantity),
      side: order.side.toLowerCase(),
      type: order.type.toLowerCase(),
      time_in_force: 'day',
      client_order_id: order.clientOrderId,
    };

    if (order.type === 'LIMIT' && order.price) {
      payload.limit_price = String(order.price);
    }

    if (order.takeProfit) {
      payload.take_profit = { limit_price: String(order.takeProfit) };
    }

    if (order.stopLoss) {
      payload.stop_loss = { stop_price: String(order.stopLoss) };
    }

    const res = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = ((await res.json().catch(() => ({}))) as any) || {};
      return {
        providerOrderId: '',
        clientOrderId: order.clientOrderId,
        symbol: order.symbol,
        status: 'REJECTED',
        filledQuantity: 0,
        fee: 0,
        feeCurrency: 'USD',
        rejectionReason: err.message || `Alpaca HTTP ${res.status}: ${res.statusText}`,
        timestamp: Date.now(),
      };
    }

    const data = (await res.json()) as any;
    const statusMap: Record<string, OrderStatus> = {
      new: 'OPEN',
      accepted: 'OPEN',
      pending_new: 'PENDING',
      partially_filled: 'PARTIALLY_FILLED',
      filled: 'FILLED',
      canceled: 'CANCELLED',
      rejected: 'REJECTED',
      expired: 'EXPIRED',
    };

    const status: OrderStatus = statusMap[data.status] || 'OPEN';
    const filledQty = parseFloat(data.filled_qty) || 0;
    const avgPrice = data.filled_avg_price ? parseFloat(data.filled_avg_price) : undefined;

    return {
      providerOrderId: data.id,
      clientOrderId: data.client_order_id || order.clientOrderId,
      symbol: order.symbol,
      status,
      filledQuantity: filledQty,
      averageFillPrice: avgPrice,
      fee: 0, // Alpaca zero commission US equities
      feeCurrency: 'USD',
      timestamp: new Date(data.created_at).getTime(),
    };
  }

  public async cancelOrder(providerOrderId: string, _symbol: string): Promise<boolean> {
    if (!this.isConnected) return false;

    const res = await fetch(`${this.baseUrl}/orders/${providerOrderId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return res.status === 204 || res.ok;
  }

  public async getOrder(providerOrderId: string, symbol: string): Promise<ProviderOrderResult> {
    const res = await fetch(`${this.baseUrl}/orders/${providerOrderId}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to get order from Alpaca: HTTP ${res.status}`);
    const data = (await res.json()) as any;

    return {
      providerOrderId: data.id,
      clientOrderId: data.client_order_id,
      symbol,
      status: (data.status.toUpperCase() as OrderStatus) || 'OPEN',
      filledQuantity: parseFloat(data.filled_qty) || 0,
      averageFillPrice: data.filled_avg_price ? parseFloat(data.filled_avg_price) : undefined,
      fee: 0,
      feeCurrency: 'USD',
      timestamp: new Date(data.created_at).getTime(),
    };
  }

  public async getOpenOrders(symbol?: string): Promise<ProviderOrderResult[]> {
    if (!this.isConnected) return [];

    let url = `${this.baseUrl}/orders?status=open`;
    if (symbol) url += `&symbols=${symbol}`;

    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) return [];
    const list = (await res.json()) as any[];

    return list.map((data) => ({
      providerOrderId: data.id,
      clientOrderId: data.client_order_id,
      symbol: data.symbol,
      status: 'OPEN',
      filledQuantity: parseFloat(data.filled_qty) || 0,
      averageFillPrice: data.filled_avg_price ? parseFloat(data.filled_avg_price) : undefined,
      fee: 0,
      feeCurrency: 'USD',
      timestamp: new Date(data.created_at).getTime(),
    }));
  }

  public async getPositions(): Promise<ProviderPositionResult[]> {
    if (!this.isConnected) return [];

    const res = await fetch(`${this.baseUrl}/positions`, { headers: this.getHeaders() });
    if (!res.ok) return [];
    const list = (await res.json()) as any[];

    return list.map((data) => ({
      symbol: data.symbol,
      side: parseFloat(data.qty) >= 0 ? 'LONG' : 'SHORT',
      quantity: Math.abs(parseFloat(data.qty)),
      entryPrice: parseFloat(data.avg_entry_price),
      currentPrice: parseFloat(data.current_price),
      unrealizedPnl: parseFloat(data.unrealized_pl),
      margin: Math.abs(parseFloat(data.market_value)) / 4,
    }));
  }

  public subscribeExecutionUpdates(_callback: (event: ProviderOrderResult) => void): () => void {
    return () => {};
  }
}
