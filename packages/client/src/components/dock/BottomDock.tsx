import React, { useState } from 'react';
import { Position, Order, Trade } from '@nexus/core';
import { X, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

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

export type DockTab = 'positions' | 'orders' | 'orderHistory' | 'tradeHistory' | 'activity';

export const BottomDock: React.FC<BottomDockProps> = ({
  positions,
  openOrders,
  tradeHistory,
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
      {/* Dock Header: Left Tabs & Right KPI Summary */}
      <div className="dock-tab-header">
        {/* Left Tabs */}
        <div className="dock-tabs">
          <button
            type="button"
            className={`dock-tab-btn ${activeTab === 'positions' ? 'active' : ''}`}
            onClick={() => setActiveTab('positions')}
          >
            Positions <span className="dock-badge">{positions.length}</span>
          </button>
          <button
            type="button"
            className={`dock-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Open Orders <span className="dock-badge">{openOrders.length}</span>
          </button>
          <button
            type="button"
            className={`dock-tab-btn ${activeTab === 'orderHistory' ? 'active' : ''}`}
            onClick={() => setActiveTab('orderHistory')}
          >
            Order History
          </button>
          <button
            type="button"
            className={`dock-tab-btn ${activeTab === 'tradeHistory' ? 'active' : ''}`}
            onClick={() => setActiveTab('tradeHistory')}
          >
            Trade History
          </button>
          <button
            type="button"
            className={`dock-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Account Activity <span className="dock-badge">{auditLogs.length}</span>
          </button>
        </div>

        {/* Right Financial KPI Strip */}
        <div className="dock-kpi-strip">
          <div className="dock-kpi-item">
            <span className="dock-kpi-label">Equity</span>
            <strong className="num">${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
          <div className="dock-kpi-item">
            <span className="dock-kpi-label">Margin</span>
            <strong className="num">${usedMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
          <div className="dock-kpi-item">
            <span className="dock-kpi-label">Free Margin</span>
            <strong className="num">${freeMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
          <div className="dock-kpi-item">
            <span className="dock-kpi-label">Margin Level</span>
            <strong className="num">{marginLevel > 99999 ? '—' : `${marginLevel.toFixed(1)}%`}</strong>
          </div>
          <div className="dock-kpi-item">
            <span className="dock-kpi-label">Daily P&L</span>
            <strong className="num" style={{ color: dailyPnl >= 0 ? 'var(--trade-buy)' : 'var(--trade-sell)' }}>
              {dailyPnl >= 0 ? '+' : ''}${dailyPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>
        </div>
      </div>

      {/* Dock Content Body */}
      <div className="dock-body">
        {/* TAB 1: POSITIONS */}
        {activeTab === 'positions' && (
          positions.length === 0 ? (
            <div className="dock-empty-state">
              <div className="dock-empty-icon-wrap">
                <Mail size={32} strokeWidth={1.5} className="dock-empty-icon" />
              </div>
              <h4 className="dock-empty-title">No open positions</h4>
              <p className="dock-empty-subtitle">Use the order panel to place a trade.</p>
            </div>
          ) : (
            <div className="dock-table-container">
              <table className="dock-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Size</th>
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
                  {positions.map((pos) => {
                    const isPositive = pos.unrealizedPnl >= 0;
                    return (
                      <tr key={pos.id}>
                        <td><strong>{pos.symbol}</strong></td>
                        <td>
                          <span className={`badge-side ${pos.side === 'LONG' ? 'badge-buy' : 'badge-sell'}`}>
                            {pos.side}
                          </span>
                        </td>
                        <td className="num">{pos.quantity}</td>
                        <td className="num">${pos.entryPrice.toFixed(2)}</td>
                        <td className="num">${pos.currentPrice.toFixed(2)}</td>
                        <td className="num">{pos.stopLoss ? `$${pos.stopLoss.toFixed(2)}` : '—'}</td>
                        <td className="num">{pos.takeProfit ? `$${pos.takeProfit.toFixed(2)}` : '—'}</td>
                        <td className="num">${pos.margin.toFixed(2)}</td>
                        <td className={`num ${isPositive ? 'pnl-positive' : 'pnl-negative'}`}>
                          {isPositive ? '+' : ''}${pos.unrealizedPnl.toFixed(2)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-close-pos"
                            onClick={() => onClosePosition(pos.id)}
                            title="Close Position Market"
                          >
                            <X size={12} /> Close
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* TAB 2: OPEN ORDERS */}
        {activeTab === 'orders' && (
          openOrders.length === 0 ? (
            <div className="dock-empty-state">
              <div className="dock-empty-icon-wrap">
                <Mail size={32} strokeWidth={1.5} className="dock-empty-icon" />
              </div>
              <h4 className="dock-empty-title">No pending orders</h4>
              <p className="dock-empty-subtitle">Limit and stop orders awaiting execution will appear here.</p>
            </div>
          ) : (
            <div className="dock-table-container">
              <table className="dock-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Limit Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {openOrders.map((ord) => (
                    <tr key={ord.id}>
                      <td className="num">{ord.id}</td>
                      <td><strong>{ord.symbol}</strong></td>
                      <td>
                        <span className={`badge-side ${ord.side === 'BUY' ? 'badge-buy' : 'badge-sell'}`}>
                          {ord.side}
                        </span>
                      </td>
                      <td>{ord.type}</td>
                      <td className="num">{ord.quantity}</td>
                      <td className="num">${ord.price ? ord.price.toFixed(2) : 'MKT'}</td>
                      <td><span className="badge-status">{ord.status}</span></td>
                      <td>
                        <button
                          type="button"
                          className="btn-close-pos"
                          onClick={() => onCancelOrder(ord.id)}
                        >
                          <X size={12} /> Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* TAB 3 & 4: ORDER & TRADE HISTORY */}
        {(activeTab === 'orderHistory' || activeTab === 'tradeHistory') && (
          tradeHistory.length === 0 ? (
            <div className="dock-empty-state">
              <div className="dock-empty-icon-wrap">
                <Mail size={32} strokeWidth={1.5} className="dock-empty-icon" />
              </div>
              <h4 className="dock-empty-title">No trade executions yet</h4>
              <p className="dock-empty-subtitle">Executed fills and closed positions will be archived here.</p>
            </div>
          ) : (
            <div className="dock-table-container">
              <table className="dock-table">
                <thead>
                  <tr>
                    <th>Execution ID</th>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Fill Quantity</th>
                    <th>Fill Price</th>
                    <th>Realized P&L</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeHistory.map((tr) => (
                    <tr key={tr.id}>
                      <td className="num">{tr.id}</td>
                      <td><strong>{tr.symbol}</strong></td>
                      <td>
                        <span className={`badge-side ${tr.side === 'BUY' ? 'badge-buy' : 'badge-sell'}`}>
                          {tr.side}
                        </span>
                      </td>
                      <td className="num">{tr.quantity}</td>
                      <td className="num">${tr.price.toFixed(2)}</td>
                      <td className={`num ${tr.realizedPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
                        {tr.realizedPnl >= 0 ? '+' : ''}${tr.realizedPnl.toFixed(2)}
                      </td>
                      <td className="num">{new Date(tr.executedAt).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* TAB 5: ACCOUNT ACTIVITY */}
        {activeTab === 'activity' && (
          <div className="dock-table-container">
            <table className="dock-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="num" style={{ color: 'var(--text-tertiary)' }}>{log.time}</td>
                    <td><strong>{log.action}</strong></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{log.details}</td>
                    <td>
                      <span
                        className="badge-status"
                        style={{
                          background: log.status === 'SUCCESS' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: log.status === 'SUCCESS' ? '#10b981' : '#ef4444',
                        }}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
