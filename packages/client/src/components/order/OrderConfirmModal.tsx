import React, { useState } from 'react';
import { OrderSide, OrderType } from '@nexus/core';
import { AlertCircle, X, ShieldCheck } from 'lucide-react';

interface OrderConfirmationModalProps {
  order: {
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
  };
  onConfirm: (enableOneClick: boolean) => void;
  onCancel: () => void;
}

export const OrderConfirmModal: React.FC<OrderConfirmationModalProps> = ({
  order,
  onConfirm,
  onCancel,
}) => {
  const [enableOneClick, setEnableOneClick] = useState<boolean>(false);
  const isBuy = order.side === 'BUY';

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                color: isBuy ? 'var(--trade-buy)' : 'var(--trade-sell)',
                fontWeight: 700,
              }}
            >
              {order.side} {order.type} ORDER
            </span>
          </div>
          <button className="btn-icon" onClick={onCancel}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              background: isBuy ? 'var(--trade-buy-subtle)' : 'var(--trade-sell-subtle)',
              border: `1px solid ${isBuy ? 'var(--trade-buy)' : 'var(--trade-sell)'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>
                {order.quantity} {order.symbol}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {order.type} Execution
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="num" style={{ fontSize: '16px', fontWeight: 700 }}>
                ${order.estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Estimated Notional</div>
            </div>
          </div>

          <table className="order-calc-table">
            <tbody>
              <tr>
                <td>Estimated Execution Price:</td>
                <td className="num">
                  ${order.price ? order.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'Market Best'}
                </td>
              </tr>
              <tr>
                <td>Required Margin Collateral:</td>
                <td className="num">
                  ${order.requiredMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td>Exchange Commission / Fees:</td>
                <td className="num">${order.estimatedFee.toFixed(2)} USD</td>
              </tr>
              <tr>
                <td>Take Profit Level:</td>
                <td
                  className="num"
                  style={{ color: order.takeProfit ? 'var(--trade-buy)' : 'var(--text-tertiary)' }}
                >
                  {order.takeProfit ? `$${order.takeProfit.toLocaleString()}` : 'None Set'}
                </td>
              </tr>
              <tr>
                <td>Stop Loss Level:</td>
                <td
                  className="num"
                  style={{ color: order.stopLoss ? 'var(--trade-sell)' : 'var(--text-tertiary)' }}
                >
                  {order.stopLoss ? `$${order.stopLoss.toLocaleString()}` : 'None Set'}
                </td>
              </tr>
            </tbody>
          </table>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: 'var(--text-secondary)',
              marginTop: 4,
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableOneClick}
                onChange={(e) => setEnableOneClick(e.target.checked)}
              />
              <span>Don't ask again (Enable One-Click Trading)</span>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-primary"
            style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-medium)' }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{
              background: isBuy ? 'var(--trade-buy)' : 'var(--trade-sell)',
              padding: '8px 20px',
            }}
            onClick={() => onConfirm(enableOneClick)}
          >
            Confirm {order.side} {order.quantity} {order.symbol}
          </button>
        </div>
      </div>
    </div>
  );
};
