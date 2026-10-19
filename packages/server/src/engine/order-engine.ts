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
  calculateLiquidationPrice,
  validateStopLossTakeProfit,
  WalletTransaction,
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
  private transactions: WalletTransaction[] = [];

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

  public initializeAccount(accountId: string, startingBalance = 50000.0, currency = 'USD'): void {
    this.balances.set(accountId, {
      total: startingBalance,
      locked: 0.0,
      currency,
    });
    this.events.onAuditLog?.({
      action: 'ACCOUNT_INITIALIZED',
      details: `Account ${accountId} initialized with dynamic capital of $${startingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${currency}.`,
      status: 'SUCCESS',
    });
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
      existing.liquidationPrice = calculateLiquidationPrice(existing.side, weightedAvgPrice, leverage);
      existing.updatedAt = new Date().toISOString();
      this.events.onPositionUpdated?.(existing);
    } else {
      const liquidationPrice = calculateLiquidationPrice(positionSide, fillPrice, leverage);
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
        liquidationPrice,
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

    // Record Real Transaction Ledger Entry
    const tradeTxn: WalletTransaction = {
      id: `tx_${trade.id}`,
      accountId: order.accountId,
      type: 'DEPOSIT',
      amount: Number((order.quantity * fillPrice).toFixed(2)),
      currency: 'USD',
      status: 'COMPLETED',
      method: order.providerId && order.providerId.startsWith('alp_') ? 'ALPACA_BROKER' : 'LIVE_EXCHANGE_STP',
      referenceId: order.providerId || order.clientOrderId,
      details: `${order.side} ${order.quantity} ${order.symbol} @ $${fillPrice.toFixed(2)} (Fee: $${order.fee.toFixed(2)} USD)`,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    this.transactions.unshift(tradeTxn);
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

    // Record Real Settlement Transaction
    const closeTxn: WalletTransaction = {
      id: `tx_${closingTrade.id}`,
      accountId: targetPos.accountId,
      type: realizedPnl >= 0 ? 'DEPOSIT' : 'WITHDRAWAL',
      amount: Math.abs(Number(realizedPnl.toFixed(2))),
      currency: 'USD',
      status: 'COMPLETED',
      method: 'REALIZED_PNL_SETTLEMENT',
      referenceId: closingTrade.id,
      details: `Settled P&L for ${targetPos.side} ${targetPos.quantity} ${targetPos.symbol} (Exit: $${exitPrice.toFixed(2)}): ${realizedPnl >= 0 ? '+' : '-'}$${Math.abs(realizedPnl).toFixed(2)} USD`,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    this.transactions.unshift(closeTxn);

    this.positions.delete(targetKey);
    this.events.onPositionClosed?.(targetPos, realizedPnl);
    this.events.onAuditLog?.({
      action: 'POSITION_CLOSED',
      details: `Closed ${targetPos.side} ${targetPos.quantity} ${targetPos.symbol} @ $${exitPrice.toFixed(2)}. Realized P&L: ${realizedPnl >= 0 ? '+' : ''}$${realizedPnl.toFixed(2)} USD`,
      status: 'SUCCESS',
    });
  }

  /**
   * Update Position Risk Levels (Stop Loss & Take Profit)
   */
  public async updatePosition(
    positionId: string,
    updates: { stopLoss?: number; takeProfit?: number }
  ): Promise<Position> {
    let targetPos: Position | undefined;
    for (const p of this.positions.values()) {
      if (p.id === positionId) {
        targetPos = p;
        break;
      }
    }

    if (!targetPos) {
      throw new Error(`Position ${positionId} not found`);
    }

    if (updates.stopLoss !== undefined || updates.takeProfit !== undefined) {
      const sl = updates.stopLoss !== undefined ? updates.stopLoss : targetPos.stopLoss;
      const tp = updates.takeProfit !== undefined ? updates.takeProfit : targetPos.takeProfit;
      const orderSide = targetPos.side === 'LONG' ? 'BUY' : 'SELL';
      const val = validateStopLossTakeProfit(orderSide, targetPos.currentPrice, sl, tp);
      if (!val.isValid) {
        throw new Error(val.error || 'Invalid Stop Loss / Take Profit parameters');
      }
      targetPos.stopLoss = updates.stopLoss;
      targetPos.takeProfit = updates.takeProfit;
    }

    targetPos.updatedAt = new Date().toISOString();
    this.events.onPositionUpdated?.(targetPos);
    this.events.onAuditLog?.({
      action: 'POSITION_MODIFIED',
      details: `Updated ${targetPos.symbol} (${targetPos.side}): SL=${targetPos.stopLoss ?? 'None'}, TP=${targetPos.takeProfit ?? 'None'}`,
      status: 'SUCCESS',
    });

    return targetPos;
  }

  /**
   * Wallet Deposit: Credit Settled Balance & Log Transaction
   */
  public deposit(accountId: string, amount: number, method: string, reference?: string): WalletTransaction {
    if (amount <= 0) {
      throw new Error('Deposit amount must be greater than zero');
    }

    const bal = this.balances.get(accountId) || { total: 0, locked: 0, currency: 'USD' };
    bal.total = Number((bal.total + amount).toFixed(2));
    this.balances.set(accountId, bal);

    const txn: WalletTransaction = {
      id: `txn_dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      accountId,
      type: 'DEPOSIT',
      amount,
      currency: bal.currency,
      status: 'COMPLETED',
      method,
      referenceId: reference || `ref_${Date.now()}`,
      details: `Deposited $${amount.toFixed(2)} USD via ${method}`,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    this.transactions.unshift(txn);
    this.events.onAuditLog?.({
      action: 'WALLET_DEPOSIT',
      details: `Credited $${amount.toFixed(2)} USD via ${method}. Settled balance: $${bal.total.toFixed(2)} USD`,
      status: 'SUCCESS',
    });

    return txn;
  }

  /**
   * Wallet Withdrawal: Deduct Free Margin & Log Transaction
   */
  public withdraw(accountId: string, amount: number, method: string, destination: string): WalletTransaction {
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than zero');
    }

    const acc = this.getAccountBalance(accountId);
    if (amount > acc.freeMargin) {
      throw new Error(`Insufficient Free Margin. Maximum withdrawable: $${acc.freeMargin.toFixed(2)} USD`);
    }

    const bal = this.balances.get(accountId) || { total: 0, locked: 0, currency: 'USD' };
    bal.total = Number((bal.total - amount).toFixed(2));
    this.balances.set(accountId, bal);

    const txn: WalletTransaction = {
      id: `txn_wth_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      accountId,
      type: 'WITHDRAWAL',
      amount,
      currency: bal.currency,
      status: 'COMPLETED',
      method,
      referenceId: `dest_${destination.substring(0, 10)}`,
      details: `Withdrew $${amount.toFixed(2)} USD to ${destination}`,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    this.transactions.unshift(txn);
    this.events.onAuditLog?.({
      action: 'WALLET_WITHDRAWAL',
      details: `Withdrew $${amount.toFixed(2)} USD to ${destination} via ${method}. Remaining balance: $${bal.total.toFixed(2)} USD`,
      status: 'SUCCESS',
    });

    return txn;
  }

  public getTransactions(accountId = 'acc_default'): WalletTransaction[] {
    return this.transactions.filter((t) => !accountId || t.accountId === accountId);
  }

  /**
   * Admin Force Close All Positions (Emergency Circuit Breaker)
   */
  public async forceCloseAllPositions(reason = 'ADMIN_CIRCUIT_BREAKER'): Promise<number> {
    const posList = Array.from(this.positions.values());
    for (const pos of posList) {
      await this.closePosition(pos.id);
    }
    this.events.onAuditLog?.({
      action: 'CIRCUIT_BREAKER_TRIGGERED',
      details: `Emergency: Force-closed all ${posList.length} open positions. Reason: ${reason}`,
      status: 'WARNING',
    });
    return posList.length;
  }

  /**
   * Admin Reset / Set Account Balance
   */
  public setAccountBalance(accountId: string, total: number): void {
    const bal = this.balances.get(accountId) || { total: 0, locked: 0, currency: 'USD' };
    bal.total = total;
    this.balances.set(accountId, bal);
    this.events.onAuditLog?.({
      action: 'ADMIN_BALANCE_ADJUST',
      details: `Account ${accountId} balance manually set to $${total.toFixed(2)} USD by administrator`,
      status: 'WARNING',
    });
  }

  /**
   * Automated SL / TP Risk Monitor & Stop-Out Auto Liquidation
   */
  private monitorInterval?: NodeJS.Timeout;

  public stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }
  }

  private startSlTpMonitor(): void {
    this.monitorInterval = setInterval(async () => {
      // 1. Monitor Individual Position SL & TP Triggers
      for (const [_key, pos] of this.positions.entries()) {
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

      // 2. Account-Level Margin Stop-Out Auto Liquidation Check
      try {
        if (this.positions.size > 0) {
          const acc = this.getAccountBalance('acc_default');
          if (acc.marginLevel <= 50.0) {
            // Margin breached Stop-Out threshold (<= 50%)!
            const sortedPositions = Array.from(this.positions.values()).sort((a, b) => a.unrealizedPnl - b.unrealizedPnl);
            const worstPosition = sortedPositions[0];
            if (worstPosition) {
              this.events.onAuditLog?.({
                action: 'STOP_OUT_LIQUIDATION',
                details: `CRITICAL STOP-OUT: Margin Level fell to ${acc.marginLevel.toFixed(1)}% (<= 50% limit). Auto-liquidating worst position: ${worstPosition.side} ${worstPosition.quantity} ${worstPosition.symbol} (P&L: $${worstPosition.unrealizedPnl.toFixed(2)} USD) to preserve equity.`,
                status: 'ERROR',
              });
              await this.closePosition(worstPosition.id);
            }
          }
        }
      } catch (_err) {}
    }, 1000);

    this.monitorInterval.unref();
  }
}
