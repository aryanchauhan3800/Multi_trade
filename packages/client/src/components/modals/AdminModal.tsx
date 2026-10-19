import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Activity,
  Users,
  Database,
  Server,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Power,
  RefreshCw,
  TrendingDown,
} from 'lucide-react';

interface AdminModalProps {
  onClose: () => void;
  onRefreshParent?: () => void;
}

const SERVER_BASE = 'http://localhost:4000';

export const AdminModal: React.FC<AdminModalProps> = ({ onClose, onRefreshParent }) => {
  const [activeTab, setActiveTab] = useState<'system' | 'risk' | 'users' | 'audit'>('system');
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [circuitBreakerStatus, setCircuitBreakerStatus] = useState<string | null>(null);
  const [customBalance, setCustomBalance] = useState<number>(100000);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const [ovRes, audRes] = await Promise.all([
        fetch(`${SERVER_BASE}/api/admin/overview`),
        fetch(`${SERVER_BASE}/api/account/audit-logs`),
      ]);

      if (ovRes.ok) {
        const data = await ovRes.json() as any;
        setOverview(data);
      }
      if (audRes.ok) {
        const data = await audRes.json() as any;
        setAuditLogs(data.auditLogs || []);
      }
    } catch (_err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const triggerCircuitBreaker = async () => {
    const confirmHalt = window.confirm(
      'EMERGENCY ACTION: Are you sure you want to trigger the global Circuit Breaker? This will immediately force-close all open positions at market price and cancel working orders.'
    );
    if (!confirmHalt) return;

    try {
      const res = await fetch(`${SERVER_BASE}/api/admin/circuit-breaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Admin Manual Circuit Breaker Triggered from Console' }),
      });
      const data = await res.json() as any;
      setCircuitBreakerStatus(data.message || 'Circuit breaker executed');
      fetchOverview();
      onRefreshParent?.();
    } catch (err: any) {
      alert(`Error triggering circuit breaker: ${err.message}`);
    }
  };

  const handleAdjustBalance = async () => {
    try {
      const res = await fetch(`${SERVER_BASE}/api/admin/adjust-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: customBalance }),
      });
      if (res.ok) {
        alert(`Account balance successfully adjusted to $${customBalance.toLocaleString()} USD`);
        fetchOverview();
        onRefreshParent?.();
      }
    } catch (err: any) {
      alert(`Balance adjustment failed: ${err.message}`);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ width: 760, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={16} color="#8b5cf6" />
            <span style={{ fontWeight: 700 }}>NEXUS ADMINISTRATION CONSOLE (RBAC: ADMIN)</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Tab Header */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)' }}>
          <button
            className={`dock-tab-btn ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            System & Architecture
          </button>
          <button
            className={`dock-tab-btn ${activeTab === 'risk' ? 'active' : ''}`}
            onClick={() => setActiveTab('risk')}
          >
            Risk & Circuit Breaker
          </button>
          <button
            className={`dock-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users & Balance Override
          </button>
          <button
            className={`dock-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            Audit Trail ({auditLogs.length})
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: SYSTEM & ARCHITECTURE */}
          {activeTab === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: 12, borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>System Status</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <CheckCircle2 size={14} /> ONLINE
                  </div>
                </div>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: 12, borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Environment</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-primary)', marginTop: 4 }}>
                    {overview?.environment || 'PAPER_TRADING'}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: 12, borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Broker Router</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981', marginTop: 4 }}>
                    {overview?.broker?.name || 'Alpaca / Mock'}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: 12, borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Market Feed</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981', marginTop: 4 }}>
                    Binance L1/L2
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, fontWeight: 600 }}>Active External Provider Health</div>
              <table className="dock-table">
                <thead>
                  <tr>
                    <th>Provider Name</th>
                    <th>Subsystem</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="dock-row">
                    <td style={{ fontWeight: 600 }}>Binance Stream Gateway</td>
                    <td>Market Data L1/L2</td>
                    <td>WebSocket (Public Stream)</td>
                    <td><span style={{ color: '#10b981' }}>CONNECTED</span></td>
                  </tr>
                  <tr className="dock-row">
                    <td style={{ fontWeight: 600 }}>Alpaca Markets v2 API</td>
                    <td>Broker Execution Layer</td>
                    <td>REST + WebSockets</td>
                    <td><span style={{ color: '#10b981' }}>STANDBY / ROUTED</span></td>
                  </tr>
                  <tr className="dock-row">
                    <td style={{ fontWeight: 600 }}>Stripe Financial Gateway</td>
                    <td>Deposit / Card Acquiring</td>
                    <td>REST + Webhooks</td>
                    <td><span style={{ color: '#10b981' }}>COMPLIANT / READY</span></td>
                  </tr>
                  <tr className="dock-row">
                    <td style={{ fontWeight: 600 }}>Coinbase Commerce</td>
                    <td>Crypto Deposit Gateway</td>
                    <td>EVM / BTC / TRC20</td>
                    <td><span style={{ color: '#10b981' }}>READY</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: RISK & CIRCUIT BREAKER */}
          {activeTab === 'risk' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  padding: 14,
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#ef4444' }}>
                    <AlertTriangle size={18} /> EMERGENCY CIRCUIT BREAKER
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Halts platform execution and liquidates all active market positions in the event of extreme volatility or API disconnect.
                  </div>
                </div>

                <button
                  className="btn-primary"
                  onClick={triggerCircuitBreaker}
                  style={{
                    background: '#ef4444',
                    border: 'none',
                    padding: '8px 16px',
                    fontWeight: 700,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Power size={14} /> TRIGGER HALT
                </button>
              </div>

              {circuitBreakerStatus && (
                <div style={{ fontSize: 12, padding: '8px 12px', background: 'var(--accent-subtle)', borderRadius: 'var(--radius-xs)' }}>
                  {circuitBreakerStatus}
                </div>
              )}

              <div style={{ fontSize: 12, fontWeight: 600 }}>Real-Time System Portfolio Risk Metrics</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: 12, borderRadius: 'var(--radius-xs)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Total Equity</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
                    ${overview?.metrics?.equity?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '100,000.00'}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: 12, borderRadius: 'var(--radius-xs)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Used Margin</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
                    ${overview?.metrics?.usedMargin?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: 12, borderRadius: 'var(--radius-xs)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Open Positions Count</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
                    {overview?.metrics?.openPositionsCount ?? 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: USERS & BALANCE OVERRIDE */}
          {activeTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Administrative Account Adjustment</div>
              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  padding: 14,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: 12, marginBottom: 8 }}>
                  Set Trading Account Balance (acc_default):
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="number"
                    className="form-input"
                    value={customBalance}
                    onChange={(e) => setCustomBalance(parseFloat(e.target.value) || 0)}
                    style={{ width: 200 }}
                  />
                  <button className="btn-primary" onClick={handleAdjustBalance}>
                    Apply Balance
                  </button>
                </div>
              </div>

              <div style={{ fontSize: 12, fontWeight: 600 }}>Active Trading Accounts</div>
              <table className="dock-table">
                <thead>
                  <tr>
                    <th>Account ID</th>
                    <th>Mode</th>
                    <th>Settled Balance</th>
                    <th>Equity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="dock-row">
                    <td className="num">acc_default</td>
                    <td>{overview?.environment || 'PAPER_TRADING'}</td>
                    <td className="num">${overview?.metrics?.totalBalance?.toFixed(2) || '100000.00'}</td>
                    <td className="num">${overview?.metrics?.equity?.toFixed(2) || '100000.00'}</td>
                    <td><span style={{ color: '#10b981' }}>ACTIVE</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: COMPLIANCE AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Immutable Financial & System Audit Trail</span>
                <button className="btn-icon" onClick={fetchOverview} title="Refresh Logs">
                  <RefreshCw size={14} />
                </button>
              </div>

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
                      <td className="num" style={{ whiteSpace: 'nowrap' }}>{log.time}</td>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{log.action}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{log.details}</td>
                      <td>
                        <span
                          style={{
                            color: log.status === 'SUCCESS' ? '#10b981' : log.status === 'WARNING' ? '#f59e0b' : '#ef4444',
                            fontWeight: 600,
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

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-primary" onClick={onClose}>
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
};
