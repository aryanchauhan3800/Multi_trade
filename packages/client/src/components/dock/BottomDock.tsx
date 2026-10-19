import React, { useState } from 'react';
import { Position, Order, Trade } from '@nexus/core';
import { X, Edit2, AlertCircle, Clock, CheckCircle2, FileText } from 'lucide-react';

interface AuditItem {
  id: string;
  time: string;
  action: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
}

interface BottomDockProps {
  positions: Position[];
  openOrders: Order[];
  tradeHistory: Trade[];
  transactions?: any[];
  auditLogs: AuditItem[];
  equity: number;
  usedMargin: number;
  freeMargin: number;
  marginLevel: number;
  dailyPnl: number;
  onClosePosition: (positionId: string) => void;
  onCancelOrder: (orderId: string) => void;
}

export type DockTab = 'positions' | 'orders' | 'history' | 'transactions' | 'activity';

export const BottomDock: React.FC<BottomDockProps> = ({
  positions,
  openOrders,
  tradeHistory,
  transactions = [],
  auditLogs,
  equity,
  usedMargin,
  freeMargin,
  marginLevel,
  dailyPnl,
  onClosePosition,
  onCancelOrder,
}) => {
  const [activeTab, setActiveTab] = useState<DockTab>('positions');

  return (
    <div className="pane bottom-dock-pane">
      {/* Dock Tabs Header */}
      <div className="dock-tab-header">
        <div className="dock-tabs">
          <button
            className={`dock-tab-btn ${activeTab === 'positions' ? 'active' : ''}`}
            onClick={() => setActiveTab('positions')}
          >
            Positions <span className="dock-badge">{positions.length}</span>
          </button>
          <button
            className={`dock-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Open Orders <span className="dock-badge">{openOrders.length}</span>
          </button>
          <button
            className={`dock-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Trade History <span className="dock-badge">{tradeHistory.length}</span>
          </button>
          <button
            className={`dock-tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions <span className="dock-badge">{transactions.length}</span>
          </button>
          <button
            className={`dock-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Account Activity <span className="dock-badge">{auditLogs.length}</span>
          </button>
        </div>

        {/* Real-time Status HUD */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11 }}>
          <span>
            Equity: <strong className="num">${equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
          </span>
          <span>
            Margin: <span className="num">${usedMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </span>
          <span>
            Free Margin: <span className="num">${freeMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </span>
          <span>
            Margin Level: <strong className="num">{marginLevel > 99999 ? '∞' : `${marginLevel.toFixed(1)}%`}</strong>
          </span>
          <span>
            Daily P&L:{' '}
            <strong
              className={`num ${dailyPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`}
            >
              {dailyPnl >= 0 ? '+' : ''}${dailyPnl.toFixed(2)}
            </strong>
          </span>
        </div>
      </div>

      {/* Dock Content Table */}
      <div className="dock-content">
        {activeTab === 'positions' && (
          <table className="dock-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Side</th>
                <th>Volume</th>
                <th>Entry Price</th>
                <th>Current Price</th>
                <th>Stop Loss</th>
                <th>Take Profit</th>
                <th>Margin</th>
                <th>Unrealized P&L</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)' }}>
                    No open positions. Use the order panel to initiate a trade.
                  </td>
                </tr>
              ) : (
                positions.map((pos) => {
                  const isLong = pos.side === 'LONG';
                  const isProfit = pos.unrealizedPnl >= 0;
                  const pnlPct = ((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * (isLong ? 100 : -100);

                  return (
                    <tr key={pos.id} className="dock-row">
                      <td style={{ fontWeight: 600 }}>{pos.symbol}</td>
                      <td style={{ color: isLong ? 'var(--trade-buy)' : 'var(--trade-sell)', fontWeight: 600 }}>
                        {pos.side}
                      </td>
                      <td className="num">{pos.quantity}</td>
                      <td className="num">${pos.entryPrice.toFixed(pos.entryPrice > 500 ? 2 : 5)}</td>
                      <td className="num">${pos.currentPrice.toFixed(pos.currentPrice > 500 ? 2 : 5)}</td>
                      <td className="num">{pos.stopLoss ? `$${pos.stopLoss}` : '—'}</td>
                      <td className="num">{pos.takeProfit ? `$${pos.takeProfit}` : '—'}</td>
                      <td className="num">${pos.margin.toFixed(2)}</td>
                      <td className={`num ${isProfit ? 'pnl-positive' : 'pnl-negative'}`} style={{ fontWeight: 600 }}>
                        {isProfit ? '+' : ''}${pos.unrealizedPnl.toFixed(2)} ({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)
                      </td>
                      <td>
                        <button
                          className="btn-icon"
                          style={{ width: 24, height: 24, color: 'var(--trade-sell)' }}
                          onClick={() => onClosePosition(pos.id)}
                          title="Close Position"
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'orders' && (
          <table className="dock-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Symbol</th>
                <th>Type</th>
                <th>Side</th>
                <th>Quantity</th>
                <th>Target Price</th>
                <th>Margin Reserved</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {openOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)' }}>
                    No working limit or stop orders.
                  </td>
                </tr>
              ) : (
                openOrders.map((ord) => (
                  <tr key={ord.id} className="dock-row">
                    <td className="num" style={{ color: 'var(--text-secondary)' }}>
                      {ord.clientOrderId.substring(0, 12)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{ord.symbol}</td>
                    <td>{ord.type}</td>
                    <td style={{ color: ord.side === 'BUY' ? 'var(--trade-buy)' : 'var(--trade-sell)', fontWeight: 600 }}>
                      {ord.side}
                    </td>
                    <td className="num">{ord.quantity}</td>
                    <td className="num">${ord.price ? ord.price.toFixed(2) : 'Market'}</td>
                    <td className="num">${ord.marginLocked.toFixed(2)}</td>
                    <td>
                      <span className="spread-pill">{ord.status}</span>
                    </td>
                    <td>
                      <button
                        className="btn-icon"
                        style={{ width: 24, height: 24, color: 'var(--trade-sell)' }}
                        onClick={() => onCancelOrder(ord.id)}
                        title="Cancel Working Order"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'history' && (
          <table className="dock-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Symbol</th>
                <th>Side</th>
                <th>Executed Qty</th>
                <th>Fill Price</th>
                <th>Realized P&L</th>
                <th>Fee</th>
                <th>Execution Ref / Venue</th>
              </tr>
            </thead>
            <tbody>
              {tradeHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)' }}>
                    No trade executions recorded today.
                  </td>
                </tr>
              ) : (
                tradeHistory.map((tr) => (
                  <tr key={tr.id} className="dock-row">
                    <td className="num" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(tr.executedAt).toLocaleTimeString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{tr.symbol}</td>
                    <td style={{ color: tr.side === 'BUY' ? 'var(--trade-buy)' : 'var(--trade-sell)', fontWeight: 600 }}>
                      {tr.side}
                    </td>
                    <td className="num">{tr.quantity}</td>
                    <td className="num">${tr.price.toFixed(tr.price > 500 ? 2 : 5)}</td>
                    <td className={`num ${tr.realizedPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
                      {tr.realizedPnl >= 0 ? '+' : ''}${tr.realizedPnl.toFixed(2)}
                    </td>
                    <td className="num">${tr.fee.toFixed(2)}</td>
                    <td className="num" style={{ fontSize: 10, color: 'var(--accent-primary)' }}>
                      {tr.providerId ? tr.providerId.substring(0, 16) : tr.id.substring(0, 16)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'transactions' && (
          <table className="dock-table">
            <thead>
              <tr>
                <th>Tx Reference</th>
                <th>Timestamp</th>
                <th>Execution Venue</th>
                <th>Type</th>
                <th>Amount (USD)</th>
                <th>Transaction Details</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)' }}>
                    No financial transactions recorded in ledger.
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any) => (
                  <tr key={tx.id} className="dock-row">
                    <td className="num" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div>{tx.referenceId ? tx.referenceId.substring(0, 16) : tx.id.substring(0, 16)}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{tx.id}</div>
                    </td>
                    <td className="num" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(tx.createdAt).toLocaleTimeString()}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 3,
                          background: tx.method?.includes('ALPACA') ? 'rgba(139, 92, 246, 0.15)' : 'var(--accent-subtle)',
                          color: tx.method?.includes('ALPACA') ? '#8b5cf6' : 'var(--accent-primary)',
                          border: `1px solid ${tx.method?.includes('ALPACA') ? '#8b5cf644' : 'var(--accent-primary)44'}`,
                        }}
                      >
                        {tx.method || 'LIVE_STP'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: tx.type === 'DEPOSIT' ? 'var(--trade-buy)' : 'var(--trade-sell)' }}>
                      {tx.type}
                    </td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      ${tx.amount ? tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{tx.details || '—'}</td>
                    <td>
                      <span style={{ color: 'var(--trade-buy)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                        <CheckCircle2 size={12} /> {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'activity' && (
          <table className="dock-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Details</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="dock-row">
                  <td className="num" style={{ color: 'var(--text-tertiary)', width: 140 }}>{log.time}</td>
                  <td style={{ fontWeight: 600, width: 160 }}>{log.action}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{log.details}</td>
                  <td style={{ width: 100 }}>
                    <span
                      style={{
                        color: log.status === 'SUCCESS' ? 'var(--trade-buy)' : '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {log.status === 'SUCCESS' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
