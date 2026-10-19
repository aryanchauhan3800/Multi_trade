import React from 'react';
import { X, TrendingUp, DollarSign, Percent, Shield, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Position } from '@nexus/core';

interface PortfolioModalProps {
  balance: number;
  equity: number;
  usedMargin: number;
  freeMargin: number;
  dailyPnl: number;
  positions: Position[];
  onClose: () => void;
}

export const PortfolioModal: React.FC<PortfolioModalProps> = ({
  balance,
  equity,
  usedMargin,
  freeMargin,
  dailyPnl,
  positions,
  onClose,
}) => {
  const totalUnrealizedPnl = positions.reduce((acc, p) => acc + p.unrealizedPnl, 0);
  const totalReturnPct = balance > 0 ? (totalUnrealizedPnl / balance) * 100 : 0;
  const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : 99999;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ width: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700 }}>PORTFOLIO & CAPITAL PERFORMANCE</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Key Metric Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                Total Equity
              </div>
              <div className="num" style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                ${equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                Unrealized P&L
              </div>
              <div
                className={`num ${totalUnrealizedPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`}
                style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}
              >
                {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                Margin Level
              </div>
              <div className="num" style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: '#10b981' }}>
                {marginLevel > 99999 ? 'Safe (∞)' : `${marginLevel.toFixed(1)}%`}
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                Today's Return
              </div>
              <div
                className={`num ${dailyPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`}
                style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}
              >
                {totalReturnPct >= 0 ? '+' : ''}{totalReturnPct.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Allocation Breakdown */}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Current Asset Exposure</div>
            {positions.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', padding: '12px 0' }}>
                No active exposure. 100% of your portfolio is in Cash (USD).
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {positions.map((p) => {
                  const notional = p.quantity * p.currentPrice;
                  const pctOfEquity = equity > 0 ? (notional / equity) * 100 : 0;
                  return (
                    <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                        <span style={{ fontWeight: 600 }}>{p.symbol} ({p.side})</span>
                        <span className="num">${notional.toFixed(2)} ({pctOfEquity.toFixed(1)}%)</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-surface-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(100, pctOfEquity)}%`,
                            height: '100%',
                            background: p.side === 'LONG' ? 'var(--trade-buy)' : 'var(--trade-sell)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
