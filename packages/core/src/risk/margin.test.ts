import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRequiredMargin,
  calculateUnrealizedPnl,
  calculateLiquidationPrice,
  calculateMarginLevel,
  validateStopLossTakeProfit,
} from './margin.js';

describe('Financial Math & Risk Engine Calculations', () => {
  it('calculates required margin accurately for leverage 100x', () => {
    // 1 BTC at $80,000 with 100x leverage = $800 margin
    const margin = calculateRequiredMargin({
      quantity: 1,
      price: 80000,
      leverage: 100,
    });
    assert.equal(margin, 800);
  });

  it('rejects invalid margin parameters (zero or negative leverage)', () => {
    assert.throws(() => {
      calculateRequiredMargin({ quantity: 1, price: 80000, leverage: 0 });
    }, /Leverage must be greater than zero/);

    assert.throws(() => {
      calculateRequiredMargin({ quantity: -1, price: 80000, leverage: 100 });
    }, /Quantity must be greater than zero/);
  });

  it('calculates unrealized P&L for LONG positions correctly', () => {
    // Bought 2 ETH at $3,000, current price $3,200 -> PnL = +$400
    const pnlLong = calculateUnrealizedPnl('LONG', 3000, 3200, 2);
    assert.equal(pnlLong, 400);

    // Bought 2 ETH at $3,000, current price $2,800 -> PnL = -$400
    const lossLong = calculateUnrealizedPnl('LONG', 3000, 2800, 2);
    assert.equal(lossLong, -400);
  });

  it('calculates unrealized P&L for SHORT positions correctly', () => {
    // Sold short 2 ETH at $3,000, current price $2,800 -> PnL = +$400
    const pnlShort = calculateUnrealizedPnl('SHORT', 3000, 2800, 2);
    assert.equal(pnlShort, 400);

    // Sold short 2 ETH at $3,000, current price $3,200 -> PnL = -$400
    const lossShort = calculateUnrealizedPnl('SHORT', 3000, 3200, 2);
    assert.equal(lossShort, -400);
  });

  it('calculates liquidation price with maintenance margin threshold', () => {
    // LONG 1 BTC at $80,000 with 100x leverage (1% initial margin), 0.5% maintenance margin
    // Drop fraction = 1% - 0.5% = 0.5% drop = $80,000 * 0.995 = $79,600
    const liqLong = calculateLiquidationPrice('LONG', 80000, 100, 0.005);
    assert.equal(liqLong, 79600);

    // SHORT 1 BTC at $80,000 with 100x leverage
    // Rise fraction = 0.5% rise = $80,000 * 1.005 = $80,400
    const liqShort = calculateLiquidationPrice('SHORT', 80000, 100, 0.005);
    assert.equal(liqShort, 80400);
  });

  it('calculates margin level percentage and safeguards against zero used margin', () => {
    const safeMarginLevel = calculateMarginLevel(100000, 0);
    assert.equal(safeMarginLevel, 999999);

    const normalMarginLevel = calculateMarginLevel(10000, 2000);
    assert.equal(normalMarginLevel, 500);

    const stopOutLevel = calculateMarginLevel(1000, 2000);
    assert.equal(stopOutLevel, 50);
  });

  it('validates Stop Loss and Take Profit levels according to side', () => {
    // BUY: SL must be < Entry, TP must be > Entry
    assert.equal(validateStopLossTakeProfit('BUY', 80000, 78000, 85000).isValid, true);
    assert.equal(validateStopLossTakeProfit('BUY', 80000, 81000, 85000).isValid, false);
    assert.equal(validateStopLossTakeProfit('BUY', 80000, 78000, 79000).isValid, false);

    // SELL: SL must be > Entry, TP must be < Entry
    assert.equal(validateStopLossTakeProfit('SELL', 80000, 82000, 75000).isValid, true);
    assert.equal(validateStopLossTakeProfit('SELL', 80000, 79000, 75000).isValid, false);
    assert.equal(validateStopLossTakeProfit('SELL', 80000, 82000, 81000).isValid, false);
  });
});
