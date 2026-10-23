import React, { useState, useMemo } from 'react';
import {
  OrderSide,
  OrderType,
  TickerData,
  calculateRequiredMargin,
  validateStopLossTakeProfit,
} from '@nexus/core';
import { SlidersHorizontal, Plus, ChevronDown } from 'lucide-react';

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
  onOpenDeposit?: () => void;
}

export const OrderEntryPanel: React.FC<OrderEntryPanelProps> = ({
  symbol,
  ticker,
  availableBalance,
  leverage,
  onRequestOrder,
  onOpenDeposit,
}) => {
  const [side, setSide] = useState<OrderSide>('BUY');
  const [type, setType] = useState<OrderType>('MARKET');
  const [quantity, setQuantity] = useState<number>(0.1);
  const [limitPrice, setLimitPrice] = useState<number>(ticker?.lastPrice || 0);

  // SL / TP Controls
  const [hasStopLoss, setHasStopLoss] = useState<boolean>(false);
  const [stopLossPrice, setStopLossPrice] = useState<number>(0);
  const [hasTakeProfit, setHasTakeProfit] = useState<boolean>(true);
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
  const estimatedNotional = useMemo(() => {
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
    return Number((estimatedNotional * 0.0005).toFixed(2));
  }, [estimatedNotional]);

  const isMarginSufficient = availableBalance >= requiredMargin + estimatedFee;

  // Preset chips
  const presets = [0.01, 0.05, 0.1, 0.5, 1];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) return;

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
      estimatedCost: estimatedNotional,
      requiredMargin,
      estimatedFee,
    });
  };

  // Base asset display e.g. "BTC" from "BTCUSD"
  const baseAsset = symbol.replace(/USD|USDT|EUR|GBP|JPY/g, '') || symbol;

  return (
    <div className="pane order-panel-pane">
      {/* Order Panel Header */}
      <div className="order-panel-header">
        <span className="order-panel-title">Order Panel</span>
        <button className="btn-icon" title="Order settings">
          <SlidersHorizontal size={15} />
        </button>
      </div>

      {/* Buy / Sell Segmented Buttons */}
      <div className="order-side-toggle">
        <button
          type="button"
          className={`order-side-btn buy ${side === 'BUY' ? 'active' : ''}`}
          onClick={() => setSide('BUY')}
        >
          Buy
        </button>
        <button
          type="button"
          className={`order-side-btn sell ${side === 'SELL' ? 'active' : ''}`}
          onClick={() => setSide('SELL')}
        >
          Sell
        </button>
      </div>

      {/* Order Type Pills: Market, Limit, Stop */}
      <div className="order-type-pills">
        {(['MARKET', 'LIMIT', 'STOP'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`order-type-pill ${type === t ? 'active' : ''}`}
            onClick={() => setType(t)}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Available Balance Row */}
      <div className="order-balance-row">
        <span className="balance-label">Available Balance</span>
        <div className="balance-value-container">
          <strong className="num">${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          {onOpenDeposit && (
            <button
              type="button"
              className="balance-add-btn"
              onClick={onOpenDeposit}
              title="Deposit funds to trade"
            >
              <Plus size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Order Size Form */}
      <form onSubmit={handleSubmit} className="order-form-body">
        {/* Order Size Field */}
        <div className="order-input-group">
          <div className="order-input-label-row">
            <span>Order Size</span>
            <div className="order-asset-select">
              <span>{baseAsset}</span>
              <ChevronDown size={12} />
            </div>
          </div>

          <div className="order-size-input-box">
            <input
              type="number"
              step="any"
              min="0.001"
              className="order-number-input num"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              required
            />
            <span className="order-usd-equiv num">
              ≈ ${estimatedNotional.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="order-presets-row">
            {presets.map((val) => (
              <button
                key={val}
                type="button"
                className={`order-preset-btn ${quantity === val ? 'active' : ''}`}
                onClick={() => setQuantity(val)}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Limit Price Input if not Market */}
        {type !== 'MARKET' && (
          <div className="order-input-group" style={{ marginTop: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, display: 'block' }}>
              {type === 'LIMIT' ? 'Limit Price (USD)' : 'Stop Price (USD)'}
            </span>
            <div className="order-size-input-box">
              <input
                type="number"
                step="any"
                className="order-number-input num"
                value={limitPrice}
                onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>
        )}

        {/* Financial Calculation Breakdown */}
        <div className="order-calc-table">
          <div className="calc-row">
            <span>Estimated Notional</span>
            <span className="num">${estimatedNotional.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="calc-row">
            <span>Required Margin (1:{leverage})</span>
            <span className="num">${requiredMargin.toFixed(3)}</span>
          </div>
          <div className="calc-row">
            <span>Est. Fee (5 bps)</span>
            <span className="num">${estimatedFee.toFixed(2)}</span>
          </div>
          <div className="calc-row">
            <span>Free Margin</span>
            <span className={`num ${!isMarginSufficient ? 'text-danger' : ''}`}>
              ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Advanced Risk Controls (Take Profit & Stop Loss Toggles) */}
        <div className="order-toggles-section">
          {/* Take Profit Toggle */}
          <div className="order-toggle-item">
            <div className="toggle-switch-row">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={hasTakeProfit}
                  onChange={(e) => setHasTakeProfit(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="toggle-label">Take Profit</span>
            </div>
            {hasTakeProfit && (
              <input
                type="number"
                step="any"
                className="toggle-price-input num"
                value={takeProfitPrice}
                onChange={(e) => setTakeProfitPrice(parseFloat(e.target.value) || 0)}
                placeholder="Target Price"
              />
            )}
          </div>

          {/* Stop Loss Toggle */}
          <div className="order-toggle-item">
            <div className="toggle-switch-row">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={hasStopLoss}
                  onChange={(e) => setHasStopLoss(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="toggle-label">Stop Loss</span>
            </div>
            {hasStopLoss && (
              <input
                type="number"
                step="any"
                className="toggle-price-input num"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(parseFloat(e.target.value) || 0)}
                placeholder="Stop Price"
              />
            )}
          </div>
        </div>

        {/* Main Big CTA Button */}
        <button
          type="submit"
          className={`order-submit-button ${side === 'BUY' ? 'btn-buy' : 'btn-sell'}`}
        >
          {side === 'BUY' ? 'Buy' : 'Sell'} {quantity} {symbol}
        </button>
      </form>
    </div>
  );
};
