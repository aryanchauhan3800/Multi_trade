// Financial Math, Risk Engine, and Margin Calculations

import { OrderSide, PositionSide } from '../types/index.js';

export interface MarginCalculationParams {
  quantity: number;
  price: number;
  leverage: number;
  lotSize?: number;
}

/**
 * Calculates required initial margin for a position or order:
 * Required Margin = (Contract Size * Quantity * Price) / Leverage
 */
export function calculateRequiredMargin({
  quantity,
  price,
  leverage,
  lotSize = 1.0,
}: MarginCalculationParams): number {
  if (leverage <= 0) throw new Error('Leverage must be greater than zero');
  if (quantity <= 0) throw new Error('Quantity must be greater than zero');
  if (price <= 0) throw new Error('Price must be greater than zero');

  const notional = quantity * lotSize * price;
  return Number((notional / leverage).toFixed(4));
}

/**
 * Calculates unrealized P&L for an open position:
 * Long: (Current Price - Entry Price) * Quantity * LotSize
 * Short: (Entry Price - Current Price) * Quantity * LotSize
 */
export function calculateUnrealizedPnl(
  side: PositionSide,
  entryPrice: number,
  currentPrice: number,
  quantity: number,
  lotSize: number = 1.0
): number {
  const diff = side === 'LONG' ? currentPrice - entryPrice : entryPrice - currentPrice;
  return Number((diff * quantity * lotSize).toFixed(4));
}

/**
 * Calculates liquidation price based on maintenance margin threshold (e.g., 20% or 0% stop out)
 */
export function calculateLiquidationPrice(
  side: PositionSide,
  entryPrice: number,
  leverage: number,
  maintenanceMarginRatio: number = 0.005 // 0.5% default maintenance margin
): number {
  if (leverage <= 0) throw new Error('Leverage must be greater than zero');
  const initialMarginRatio = 1 / leverage;

  if (side === 'LONG') {
    // Price drops to liquidation
    const dropFraction = initialMarginRatio - maintenanceMarginRatio;
    return Number(Math.max(0, entryPrice * (1 - dropFraction)).toFixed(4));
  } else {
    // Price rises to liquidation
    const riseFraction = initialMarginRatio - maintenanceMarginRatio;
    return Number((entryPrice * (1 + riseFraction)).toFixed(4));
  }
}

/**
 * Calculates margin level percentage:
 * Margin Level % = (Equity / Used Margin) * 100
 */
export function calculateMarginLevel(equity: number, usedMargin: number): number {
  if (usedMargin <= 0) return 999999; // Infinite / Safe
  return Number(((equity / usedMargin) * 100).toFixed(2));
}

/**
 * Validates Stop Loss and Take Profit levels according to order side:
 * Buy: SL < Entry < TP
 * Sell: TP < Entry < SL
 */
export function validateStopLossTakeProfit(
  side: OrderSide,
  entryPrice: number,
  stopLoss?: number,
  takeProfit?: number
): { isValid: boolean; error?: string } {
  if (side === 'BUY') {
    if (stopLoss !== undefined && stopLoss >= entryPrice) {
      return { isValid: false, error: 'Stop Loss for a BUY order must be below the entry price.' };
    }
    if (takeProfit !== undefined && takeProfit <= entryPrice) {
      return { isValid: false, error: 'Take Profit for a BUY order must be above the entry price.' };
    }
  } else {
    if (stopLoss !== undefined && stopLoss <= entryPrice) {
      return { isValid: false, error: 'Stop Loss for a SELL order must be above the entry price.' };
    }
    if (takeProfit !== undefined && takeProfit >= entryPrice) {
      return { isValid: false, error: 'Take Profit for a SELL order must be below the entry price.' };
    }
  }

  return { isValid: true };
}
