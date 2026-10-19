// Order Management System (OMS) & Pre-Trade Risk Engine

import {
  Order,
  Position,
  Trade,
  OrderSide,
  OrderType,
  OrderStatus,
  PositionSide,
  calculateRequiredMargin,
  calculateUnrealizedPnl,
  validateStopLossTakeProfit,
} from '@nexus/core';
import { BrokerProvider } from '@nexus/core';
import { CompositeMarketDataProvider } from '../providers/market-data/composite-market-data.js';

export interface SubmitOrderRequest {
  accountId: string;
  userId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  clientOrderId?: string;
}

export interface OrderEngineEvents {
  onOrderCreated?: (order: Order) => void;
  onOrderUpdated?: (order: Order) => void;
  onPositionUpdated?: (position: Position) => void;
  onPositionClosed?: (position: Position, realizedPnl: number) => void;
  onAuditLog?: (log: { action: string; details: string; status: 'SUCCESS' | 'WARNING' | 'ERROR' }) => void;
}

export class OrderEngine {
  private orders: Map<string, Order> = new Map();
  private positions: Map<string, Position> = new Map();
  private trades: Trade[] = [];

  // Account In-Memory Balances (mapped to DB in persistence phase)
  private balances: Map<string, { total: number; locked: number; currency: string }> = new Map();

  constructor(
    private broker: BrokerProvider,
    private marketData: CompositeMarketDataProvider,
    private events: OrderEngineEvents = {}
  ) {
    // Seed default account
    this.balances.set('acc_default', {
      total: 100000.0,
      locked: 0.0,
      currency: 'USD',
    });

    // Start background SL / TP Price Level Monitor
    this.startSlTpMonitor();
  }

  public getAccountBalance(accountId = 'acc_default') {
    const bal = this.balances.get(accountId) || { total: 100000.0, locked: 0.0, currency: 'USD' };
    const usedMargin = Array.from(this.positions.values()).reduce((sum, p) => sum + p.margin, 0);
    const unrealizedPnl = Array.from(this.positions.values()).reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const equity = bal.total + unrealizedPnl;
    const freeMargin = Math.max(0, equity - usedMargin);
    const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : 999999;

    return {
      totalBalance: bal.total,
      equity,
      usedMargin,
      freeMargin,
      marginLevel,
      unrealizedPnl,
      currency: bal.currency,
    };
  }

  public getOpenOrders(): Order[] {
    return Array.from(this.orders.values()).filter(
      (o) => o.status === 'OPEN' || o.status === 'PENDING' || o.status === 'PARTIALLY_FILLED'
    );
  }

  public getOrderHistory(): Order[] {
    return Array.from(this.orders.values());
  }

  public getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  public getTrades(): Trade[] {
    return [...this.trades];
  }

  /**
   * Pre-Trade Risk Checks & Order Submission Pipeline
   */
  public async submitOrder(req: SubmitOrderRequest, leverage = 100): Promise<Order> {
    const clientOrderId = req.clientOrderId || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ticker = await this.marketData.getTicker(req.symbol);

    const executionPrice =
      req.type === 'MARKET' ? (req.side === 'BUY' ? ticker.ask : ticker.bid) : req.price || ticker.lastPrice;

    // 1. Validation: Quantity & Price
    if (req.quantity <= 0) {
      throw new Error('Order quantity must be greater than zero');
    }
    if (executionPrice <= 0) {
      throw new Error('Invalid execution price');
    }

    // 2. Stop Loss & Take Profit Sanity Check
    if (req.stopLoss !== undefined || req.takeProfit !== undefined) {
      const slTpCheck = validateStopLossTakeProfit(req.side, executionPrice, req.stopLoss, req.takeProfit);
      if (!slTpCheck.isValid) {
        throw new Error(slTpCheck.error || 'Invalid Stop Loss or Take Profit values');
      }
    }

    // 3. Margin & Leverage Risk Calculation
    const requiredMargin = calculateRequiredMargin({
      quantity: req.quantity,
      price: executionPrice,
      leverage,
    });

    const fee = Number((req.quantity * executionPrice * 0.0005).toFixed(4)); // 5 bps exchange fee
    const acc = this.getAccountBalance(req.accountId);

    if (acc.freeMargin < requiredMargin + fee) {
      this.events.onAuditLog?.({
        action: 'RISK_REJECTION',
        details: `Rejected ${req.side} ${req.quantity} ${req.symbol}: Insufficient free margin ($${acc.freeMargin.toFixed(2)} available vs $${(requiredMargin + fee).toFixed(2)} required).`,
        status: 'ERROR',
      });
      throw new Error(
        `Insufficient Free Margin: Required $${(requiredMargin + fee).toFixed(2)} USD, Available $${acc.freeMargin.toFixed(2)} USD`
      );
    }

    // 4. Create Order in PENDING State
    const orderId = `ord_int_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const internalOrder: Order = {
      id: orderId,
      accountId: req.accountId,
      instrumentId: `inst_${req.symbol}`,
      symbol: req.symbol,
      clientOrderId,
      side: req.side,
      type: req.type,
      quantity: req.quantity,
      price: req.price,
      stopLoss: req.stopLoss,
      takeProfit: req.takeProfit,
      filledQuantity: 0,
      fee,
      feeCurrency: 'USD',
      marginLocked: requiredMargin,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.orders.set(orderId, internalOrder);
    this.events.onOrderCreated?.(internalOrder);

    // 5. Submit to Selected Broker / Exchange Provider
    try {
      const providerResult = await this.broker.submitOrder({
        clientOrderId,
        symbol: req.symbol,
        side: req.side,
        type: req.type,
        quantity: req.quantity,
        price: req.price,
        stopLoss: req.stopLoss,
        takeProfit: req.takeProfit,
      });

      internalOrder.providerId = providerResult.providerOrderId;
      internalOrder.status = providerResult.status;
      internalOrder.filledQuantity = providerResult.filledQuantity;
      internalOrder.averageFillPrice = providerResult.averageFillPrice;
      internalOrder.updatedAt = new Date().toISOString();

      if (providerResult.status === 'REJECTED') {
        internalOrder.rejectionReason = providerResult.rejectionReason || 'Provider rejected order';
        this.events.onAuditLog?.({
          action: 'PROVIDER_REJECTION',
          details: `Order ${clientOrderId} rejected by ${this.broker.name}: ${internalOrder.rejectionReason}`,
          status: 'ERROR',
        });
        return internalOrder;
      }

      // If Filled, Update Positions and Record Trade
      if (providerResult.status === 'FILLED' && providerResult.averageFillPrice) {
        this.recordFill(internalOrder, providerResult.averageFillPrice, leverage);
      }

      this.events.onOrderUpdated?.(internalOrder);
      this.events.onAuditLog?.({
        action: 'ORDER_SUBMITTED',
        details: `${req.side} ${req.quantity} ${req.symbol} @ $${executionPrice.toFixed(2)} routed via ${this.broker.name}. Status: ${internalOrder.status}`,
        status: 'SUCCESS',
      });

      return internalOrder;
    } catch (err: any) {
      internalOrder.status = 'REJECTED';
      internalOrder.rejectionReason = err.message || 'Execution provider error';
      this.events.onOrderUpdated?.(internalOrder);
      this.events.onAuditLog?.({
        action: 'EXECUTION_ERROR',
        details: `Failed to route order ${clientOrderId}: ${err.message}`,
        status: 'ERROR',
      });
      throw err;
    }
  }

  private recordFill(order: Order, fillPrice: number, leverage: number): void {
    const positionSide: PositionSide = order.side === 'BUY' ? 'LONG' : 'SHORT';
    const positionKey = `${order.accountId}_${order.symbol}_${positionSide}`;
    const existing = this.positions.get(positionKey);

    if (existing) {
      const totalQty = existing.quantity + order.quantity;
      const weightedAvgPrice = (existing.entryPrice * existing.quantity + fillPrice * order.quantity) / totalQty;
      existing.quantity = totalQty;
      existing.entryPrice = Number(weightedAvgPrice.toFixed(5));
      existing.currentPrice = fillPrice;
      existing.margin = calculateRequiredMargin({
        quantity: totalQty,
        price: weightedAvgPrice,
        leverage,
      });
      existing.updatedAt = new Date().toISOString();
      this.events.onPositionUpdated?.(existing);
    } else {
      const newPos: Position = {
        id: `pos_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        accountId: order.accountId,
        instrumentId: order.instrumentId,
        symbol: order.symbol,
        side: positionSide,
        quantity: order.quantity,
        entryPrice: fillPrice,
        currentPrice: fillPrice,
        unrealizedPnl: 0,
        realizedPnl: 0,
        margin: order.marginLocked,
        leverage,
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.positions.set(positionKey, newPos);
      this.events.onPositionUpdated?.(newPos);
    }

    // Record Executed Trade
    const trade: Trade = {
      id: `trd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      providerId: order.providerId,
      orderId: order.id,
      accountId: order.accountId,
      instrumentId: order.instrumentId,
      symbol: order.symbol,
      side: order.side,
      price: fillPrice,
      quantity: order.quantity,
      fee: order.fee,
      feeCurrency: order.feeCurrency,
      realizedPnl: 0,
      executedAt: new Date().toISOString(),
    };
    this.trades.unshift(trade);
  }

  public async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) return false;

    if (order.status !== 'OPEN' && order.status !== 'PENDING') {
      return false;
    }

    if (order.providerId) {
      await this.broker.cancelOrder(order.providerId, order.symbol).catch(() => {});
    }

    order.status = 'CANCELLED';
    order.updatedAt = new Date().toISOString();
    this.events.onOrderUpdated?.(order);
    this.events.onAuditLog?.({
      action: 'ORDER_CANCELLED',
      details: `Cancelled order ${order.clientOrderId} (${order.symbol})`,
      status: 'SUCCESS',
    });
    return true;
  }

  public async closePosition(positionId: string): Promise<void> {
    let targetPos: Position | undefined;
    let targetKey: string | undefined;

    for (const [key, p] of this.positions.entries()) {
      if (p.id === positionId) {
        targetPos = p;
        targetKey = key;
        break;
      }
    }

    if (!targetPos || !targetKey) {
      throw new Error(`Position ${positionId} not found`);
    }

    const ticker = await this.marketData.getTicker(targetPos.symbol);
    const exitPrice = targetPos.side === 'LONG' ? ticker.bid : ticker.ask;
    const realizedPnl = calculateUnrealizedPnl(targetPos.side, targetPos.entryPrice, exitPrice, targetPos.quantity);

    // Adjust Account Balance with Realized P&L
    const bal = this.balances.get(targetPos.accountId);
    if (bal) {
      bal.total = Number((bal.total + realizedPnl).toFixed(2));
    }

    // Record Closing Trade
    const closingTrade: Trade = {
      id: `trd_close_${Date.now()}`,
      orderId: `ord_close_${Date.now()}`,
      accountId: targetPos.accountId,
      instrumentId: targetPos.instrumentId,
      symbol: targetPos.symbol,
      side: targetPos.side === 'LONG' ? 'SELL' : 'BUY',
      price: exitPrice,
      quantity: targetPos.quantity,
      fee: Number((targetPos.quantity * exitPrice * 0.0005).toFixed(2)),
      feeCurrency: 'USD',
      realizedPnl,
      executedAt: new Date().toISOString(),
    };
    this.trades.unshift(closingTrade);

    this.positions.delete(targetKey);
    this.events.onPositionClosed?.(targetPos, realizedPnl);
    this.events.onAuditLog?.({
      action: 'POSITION_CLOSED',
      details: `Closed ${targetPos.side} ${targetPos.quantity} ${targetPos.symbol} @ $${exitPrice.toFixed(2)}. Realized P&L: ${realizedPnl >= 0 ? '+' : ''}$${realizedPnl.toFixed(2)} USD`,
      status: 'SUCCESS',
    });
  }

  /**
   * Automated SL / TP Risk Monitor
   */
  private startSlTpMonitor(): void {
    setInterval(async () => {
      for (const [key, pos] of this.positions.entries()) {
        try {
          const ticker = await this.marketData.getTicker(pos.symbol);
          const currentPrice = pos.side === 'LONG' ? ticker.bid : ticker.ask;
          pos.currentPrice = currentPrice;
          pos.unrealizedPnl = calculateUnrealizedPnl(pos.side, pos.entryPrice, currentPrice, pos.quantity);

          // Check Stop Loss Trigger
          if (pos.stopLoss) {
            const isSlTriggered = pos.side === 'LONG' ? currentPrice <= pos.stopLoss : currentPrice >= pos.stopLoss;
            if (isSlTriggered) {
              this.events.onAuditLog?.({
                action: 'STOP_LOSS_TRIGGERED',
                details: `Auto SL triggered for ${pos.symbol} @ $${currentPrice} (SL was $${pos.stopLoss})`,
                status: 'WARNING',
              });
              await this.closePosition(pos.id);
              continue;
            }
          }

          // Check Take Profit Trigger
          if (pos.takeProfit) {
            const isTpTriggered = pos.side === 'LONG' ? currentPrice >= pos.takeProfit : currentPrice <= pos.takeProfit;
            if (isTpTriggered) {
              this.events.onAuditLog?.({
                action: 'TAKE_PROFIT_TRIGGERED',
                details: `Auto TP triggered for ${pos.symbol} @ $${currentPrice} (TP was $${pos.takeProfit})`,
                status: 'SUCCESS',
              });
              await this.closePosition(pos.id);
              continue;
            }
          }

          this.events.onPositionUpdated?.(pos);
        } catch (_err) {}
      }
    }, 1000);
  }
}
