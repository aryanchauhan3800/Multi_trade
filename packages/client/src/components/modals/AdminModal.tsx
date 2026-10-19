import React, { useState } from 'react';
import { X, Shield, Activity, Users, Database, Server, CheckCircle2, AlertTriangle } from 'lucide-react';

interface AdminModalProps {
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'system' | 'users' | 'providers' | 'audit'>('system');

  // Provider health telemetry status
  const providerStatus = [
    { name: 'Binance WebSocket Feed (Crypto L1/L2)', status: 'HEALTHY', latency: '18ms', type: 'Market Data' },
    { name: 'Alpaca Markets Broker API', status: 'ACTIVE', latency: '34ms', type: 'Broker & Execution' },
    { name: 'Paper Simulated Matching Engine', status: 'ONLINE', latency: '< 1ms', type: 'OMS Simulation' },
    { name: 'PostgreSQL Database Connection Pool', status: 'HEALTHY', latency: '3ms', type: 'Persistence' },
    { name: 'Stripe Payment Gateway Webhooks', status: 'HEALTHY', latency: '42ms', type: 'Payment Provider' },
  ];

  const sampleUsers = [
    { id: 'usr_81923', email: 'trader.alex@nexus.internal', role: 'TRADER', status: 'ACTIVE', balance: '$100,000.00' },
    { id: 'usr_44912', email: 'support.jane@nexus.internal', role: 'SUPPORT', status: 'ACTIVE', balance: '$0.00' },
    { id: 'usr_10001', email: 'admin@nexus.internal', role: 'ADMIN', status: 'ACTIVE', balance: '$500,000.00' },
  ];

  const sampleAuditLogs = [
    { id: 'aud_912', time: '2026-10-19 22:45:10', actor: 'usr_81923', action: 'ORDER_SUBMISSION', status: 'SUCCESS' },
    { id: 'aud_911', time: '2026-10-19 22:42:01', actor: 'usr_81923', action: 'RISK_MARGIN_CHECK', status: 'PASSED' },
    { id: 'aud_910', time: '2026-10-19 22:38:50', actor: 'SYSTEM', action: 'PROVIDER_HEARTBEAT', status: 'SUCCESS' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ width: 720 }} onClick={(e) => e.stopPropagation()}>
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
            System & Providers
          </button>
          <button
            className={`dock-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users & Accounts
          </button>
          <button
            className={`dock-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            Compliance & Audit Logs
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>External Provider Health & Telemetry</div>
              <table className="dock-table">
                <thead>
                  <tr>
                    <th>Provider Name</th>
                    <th>Type</th>
                    <th>Latency</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {providerStatus.map((p, idx) => (
                    <tr key={idx} className="dock-row">
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{p.type}</td>
                      <td className="num">{p.latency}</td>
                      <td>
                        <span style={{ color: 'var(--trade-buy)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={12} /> {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Registered Trading Accounts</div>
              <table className="dock-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Settled Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleUsers.map((u) => (
                    <tr key={u.id} className="dock-row">
                      <td className="num" style={{ color: 'var(--text-tertiary)' }}>{u.id}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className="spread-pill">{u.role}</span>
                      </td>
                      <td className="num">{u.balance}</td>
                      <td style={{ color: 'var(--trade-buy)' }}>{u.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Immutable Compliance Audit Trail</div>
              <table className="dock-table">
                <thead>
                  <tr>
                    <th>Audit ID</th>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleAuditLogs.map((log) => (
                    <tr key={log.id} className="dock-row">
                      <td className="num" style={{ color: 'var(--text-tertiary)' }}>{log.id}</td>
                      <td className="num">{log.time}</td>
                      <td>{log.actor}</td>
                      <td style={{ fontWeight: 600 }}>{log.action}</td>
                      <td style={{ color: 'var(--trade-buy)' }}>{log.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
};
