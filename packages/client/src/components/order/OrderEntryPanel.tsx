import React, { useState, useMemo } from 'react';
import {
  OrderSide,
  OrderType,
  TickerData,
  calculateRequiredMargin,
  validateStopLossTakeProfit,
} from '@nexus/core';
import { ShieldAlert, Zap, HelpCircle } from 'lucide-react';

interface OrderEntryPanelProps {
  symbol: string;
  ticker?: TickerData;
  availableBalance: number;
  leverage: number;
  oneClickMode: boolean;
  onToggleOneClick: (enabled: boolean) => void;
  onRequestOrder: (order: {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
    estimatedCost: number;
    requiredMargin: number;
    estimatedFee: number;
  }) => void;
}

export const OrderEntryPanel: React.FC<OrderEntryPanelProps> = ({
  symbol,
  ticker,
  availableBalance,
  leverage,
  oneClickMode,
  onToggleOneClick,
  onRequestOrder,
}) => {
  const [side, setSide] = useState<OrderSide>('BUY');
  const [type, setType] = useState<OrderType>('MARKET');
  const [quantity, setQuantity] = useState<number>(0.1);
  const [limitPrice, setLimitPrice] = useState<number>(ticker?.lastPrice || 0);

  // SL / TP Controls
  const [hasStopLoss, setHasStopLoss] = useState<boolean>(false);
  const [stopLossPrice, setStopLossPrice] = useState<number>(0);
  const [hasTakeProfit, setHasTakeProfit] = useState<boolean>(false);
  const [takeProfitPrice, setTakeProfitPrice] = useState<number>(0);

  // Auto-fill price when ticker loads or symbol changes
  React.useEffect(() => {
    if (ticker) {
      if (limitPrice === 0) setLimitPrice(ticker.lastPrice);
      if (stopLossPrice === 0) {
        setStopLossPrice(
          Number((side === 'BUY' ? ticker.bid * 0.98 : ticker.ask * 1.02).toFixed(ticker.lastPrice > 500 ? 2 : 5))
        );
      }
      if (takeProfitPrice === 0) {
        setTakeProfitPrice(
          Number((side === 'BUY' ? ticker.ask * 1.03 : ticker.bid * 0.97).toFixed(ticker.lastPrice > 500 ? 2 : 5))
        );
      }
    }
  }, [ticker, symbol, side]);

  const currentPrice = useMemo(() => {
    if (!ticker) return 0;
    return side === 'BUY' ? ticker.ask : ticker.bid;
  }, [ticker, side]);

  const targetExecutionPrice = type === 'MARKET' ? currentPrice : limitPrice;

  // Financial Calculations
  const estimatedCost = useMemo(() => {
    return Number((quantity * targetExecutionPrice).toFixed(2));
  }, [quantity, targetExecutionPrice]);

  const requiredMargin = useMemo(() => {
    if (targetExecutionPrice <= 0 || quantity <= 0) return 0;
    return calculateRequiredMargin({
      quantity,
      price: targetExecutionPrice,
      leverage,
    });
  }, [quantity, targetExecutionPrice, leverage]);

  const estimatedFee = useMemo(() => {
    // 5 bps (0.05%) standard exchange commission
    return Number((estimatedCost * 0.0005).toFixed(2));
  }, [estimatedCost]);

  // Projected P&L for Stop Loss & Take Profit
  const slPnl = useMemo(() => {
    if (!hasStopLoss || stopLossPrice <= 0 || targetExecutionPrice <= 0) return null;
    const diff = side === 'BUY' ? stopLossPrice - targetExecutionPrice : targetExecutionPrice - stopLossPrice;
    const pnl = diff * quantity;
    const pct = (diff / targetExecutionPrice) * 100;
    return { pnl: Number(pnl.toFixed(2)), pct: Number(pct.toFixed(2)) };
  }, [hasStopLoss, stopLossPrice, targetExecutionPrice, side, quantity]);

  const tpPnl = useMemo(() => {
    if (!hasTakeProfit || takeProfitPrice <= 0 || targetExecutionPrice <= 0) return null;
    const diff = side === 'BUY' ? takeProfitPrice - targetExecutionPrice : targetExecutionPrice - takeProfitPrice;
    const pnl = diff * quantity;
    const pct = (diff / targetExecutionPrice) * 100;
    return { pnl: Number(pnl.toFixed(2)), pct: Number(pct.toFixed(2)) };
  }, [hasTakeProfit, takeProfitPrice, targetExecutionPrice, side, quantity]);

  const isMarginSufficient = availableBalance >= requiredMargin + estimatedFee;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMarginSufficient) return;

    if (hasStopLoss || hasTakeProfit) {
      const validation = validateStopLossTakeProfit(
        side,
        targetExecutionPrice,
        hasStopLoss ? stopLossPrice : undefined,
        hasTakeProfit ? takeProfitPrice : undefined
      );
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }
    }

    onRequestOrder({
      symbol,
      side,
      type,
      quantity,
      price: type !== 'MARKET' ? limitPrice : undefined,
      stopLoss: hasStopLoss ? stopLossPrice : undefined,
      takeProfit: hasTakeProfit ? takeProfitPrice : undefined,
      estimatedCost,
      requiredMargin,
      estimatedFee,
    });
  };

  return (
    <div className="pane order-entry-pane">
      <div className="pane-header">
        <span>ORDER EXECUTION</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>1-Click</span>
          <button
            className="btn-icon"
            style={{ width: 24, height: 24, color: oneClickMode ? '#f59e0b' : 'var(--text-disabled)' }}
            onClick={() => onToggleOneClick(!oneClickMode)}
            title={oneClickMode ? 'One-Click Trading Enabled' : 'Confirmation Modal Active'}
          >
            <Zap size={14} fill={oneClickMode ? '#f59e0b' : 'none'} />
          </button>
        </div>
      </div>

      {/* Buy / Sell Large Buttons with Live Bid/Ask Inside */}
      <div className="order-toggle-container">
        <button
          type="button"
          className={`order-side-btn buy ${side === 'BUY' ? 'active' : ''}`}
          onClick={() => setSide('BUY')}
        >
          <span className="order-side-title">BUY</span>
          <span className="order-side-price">{ticker ? ticker.ask.toFixed(ticker.ask > 500 ? 2 : 5) : '0.00'}</span>
        </button>

        <button
          type="button"
          className={`order-side-btn sell ${side === 'SELL' ? 'active' : ''}`}
          onClick={() => setSide('SELL')}
        >
          <span className="order-side-title">SELL</span>
          <span className="order-side-price">{ticker ? ticker.bid.toFixed(ticker.bid > 500 ? 2 : 5) : '0.00'}</span>
        </button>
      </div>

      {/* Form Controls */}
      <form className="order-form-body" onSubmit={handleSubmit}>
        {/* Order Type */}
        <div className="form-group">
          <div className="form-label-row">
            <span>Order Type</span>
          </div>
          <div className="form-input-container">
            <select
              className="form-input"
              value={type}
              onChange={(e) => setType(e.target.value as OrderType)}
            >
              <option value="MARKET">Market Execution</option>
              <option value="LIMIT">Limit Order</option>
              <option value="STOP">Stop Order</option>
            </select>
          </div>
        </div>

        {/* Limit Price (if non-market) */}
        {type !== 'MARKET' && (
          <div className="form-group">
            <div className="form-label-row">
              <span>Order Price</span>
            </div>
            <div className="form-input-container">
              <input
                type="number"
                step="any"
                className="form-input"
                value={limitPrice}
                onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
              />
              <span className="form-unit">USD</span>
            </div>
          </div>
        )}

        {/* Quantity / Volume */}
        <div className="form-group">
          <div className="form-label-row">
            <span>Volume (Lots / Units)</span>
            <span className="num">Min: 0.01</span>
          </div>
          <div className="form-input-container">
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="form-input"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0.01)}
            />
            <span className="form-unit">{symbol.includes('USD') ? symbol.replace('USD', '') : 'Units'}</span>
          </div>
          <div className="quick-lot-row">
            {[0.01, 0.05, 0.1, 0.5, 1.0].map((amt) => (
              <button
                key={amt}
                type="button"
                className="quick-lot-btn"
                onClick={() => setQuantity(amt)}
              >
                {amt}
              </button>
            ))}
          </div>
        </div>

        {/* Stop Loss & Take Profit Group */}
        <div className="risk-control-box">
          {/* Take Profit */}
          <div>
            <div className="risk-toggle-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hasTakeProfit}
                  onChange={(e) => setHasTakeProfit(e.target.checked)}
                />
                <span style={{ color: 'var(--trade-buy)' }}>Take Profit</span>
              </label>
              {tpPnl && (
                <span className="num" style={{ color: 'var(--trade-buy)' }}>
                  +{tpPnl.pnl > 0 ? tpPnl.pnl : 0} USD (+{tpPnl.pct}%)
                </span>
              )}
            </div>
            {hasTakeProfit && (
              <div className="form-input-container" style={{ marginTop: 6 }}>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={takeProfitPrice}
                  onChange={(e) => setTakeProfitPrice(parseFloat(e.target.value) || 0)}
                />
                <span className="form-unit">USD</span>
              </div>
            )}
          </div>

          {/* Stop Loss */}
          <div>
            <div className="risk-toggle-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hasStopLoss}
                  onChange={(e) => setHasStopLoss(e.target.checked)}
                />
                <span style={{ color: 'var(--trade-sell)' }}>Stop Loss</span>
              </label>
              {slPnl && (
                <span className="num" style={{ color: 'var(--trade-sell)' }}>
                  {slPnl.pnl} USD ({slPnl.pct}%)
                </span>
              )}
            </div>
            {hasStopLoss && (
              <div className="form-input-container" style={{ marginTop: 6 }}>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(parseFloat(e.target.value) || 0)}
                />
                <span className="form-unit">USD</span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Margin & Cost Table */}
        <table className="order-calc-table">
          <tbody>
            <tr>
              <td>Estimated Notional:</td>
              <td className="num">${estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td>Required Margin (1:{leverage}):</td>
              <td className="num">${requiredMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td>Estimated Fee (5 bps):</td>
              <td className="num">${estimatedFee.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Free Margin:</td>
              <td className="num" style={{ color: isMarginSufficient ? 'var(--text-primary)' : 'var(--trade-sell)' }}>
                ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>

        {!isMarginSufficient && (
          <div style={{ color: 'var(--trade-sell)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ShieldAlert size={14} /> Insufficient Free Margin to open position.
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isMarginSufficient}
          className={`btn-submit-order ${side === 'BUY' ? 'buy' : 'sell'}`}
          style={{ opacity: isMarginSufficient ? 1 : 0.5, cursor: isMarginSufficient ? 'pointer' : 'not-allowed' }}
        >
          {side} {quantity} {symbol}
        </button>
      </form>
    </div>
  );
};
