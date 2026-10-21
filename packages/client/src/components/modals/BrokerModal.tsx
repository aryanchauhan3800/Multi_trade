import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Shield,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader,
  ExternalLink,
  Lock,
  RefreshCw,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { EnvironmentMode } from '@nexus/core';

interface BrokerModalProps {
  onClose: () => void;
  onRefreshParent?: () => void;
}

import { API_BASE_URL } from '../../config';

const SERVER_BASE = API_BASE_URL;

export const BrokerModal: React.FC<BrokerModalProps> = ({ onClose, onRefreshParent }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [brokerStatus, setBrokerStatus] = useState<any | null>(null);

  // Form State
  const [apiKey, setApiKey] = useState<string>('');
  const [apiSecret, setApiSecret] = useState<string>('');
  const [environment, setEnvironment] = useState<EnvironmentMode>('PAPER_TRADING');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchBrokerStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${SERVER_BASE}/api/broker/status`);
      if (res.ok) {
        const data = (await res.json()) as any;
        setBrokerStatus(data.status);
        if (data.status?.environment) {
          setEnvironment(data.status.environment);
        }
      }
    } catch (_err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrokerStatus();
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !apiSecret) {
      setFeedback({ type: 'error', message: 'Please provide both Alpaca API Key ID and Secret Key.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`${SERVER_BASE}/api/broker/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
          environment,
        }),
      });

      const data = (await res.json()) as any;

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to authenticate with broker API');
      }

      setFeedback({
        type: 'success',
        message: `Successfully connected to Alpaca Markets! Real stock and crypto transactions active in ${environment} mode.`,
      });

      fetchBrokerStatus();
      onRefreshParent?.();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Broker connection error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ width: 620, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 'var(--radius-xs)',
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--trade-buy)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cpu size={16} />
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>
                REAL BROKER & EXECUTION GATEWAY
              </span>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                Alpaca Markets v2 & Live Direct Market Access (NASDAQ/NYSE)
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Active Broker Route HUD */}
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xs)',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                Active Execution Route
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--trade-buy)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '2px 8px',
                  borderRadius: 3,
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <CheckCircle2 size={11} />
                <span>{brokerStatus?.provider === 'INSTITUTIONAL_STP' ? 'LIVE STP MATCHING' : 'ALPACA BROKER ACTIVE'}</span>
              </span>
            </div>

            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {brokerStatus?.name || 'Alpaca Markets / Direct STP Gateway'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Environment Mode:{' '}
              <strong style={{ color: 'var(--accent-primary)' }}>{brokerStatus?.environment || environment}</strong> • Real Live Market Quotes
            </div>

            {/* If Real Alpaca Account connected, display account stats */}
            {brokerStatus?.account && (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Account ID</div>
                  <div className="num" style={{ fontWeight: 700, fontSize: 12 }}>{brokerStatus.account.account_number}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Buying Power</div>
                  <div className="num" style={{ fontWeight: 700, fontSize: 12, color: 'var(--trade-buy)' }}>
                    ${parseFloat(brokerStatus.account.buying_power || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Portfolio Cash</div>
                  <div className="num" style={{ fontWeight: 700, fontSize: 12 }}>
                    ${parseFloat(brokerStatus.account.cash || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Feedback alert */}
          {feedback && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 'var(--radius-xs)',
                background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${feedback.type === 'success' ? '#10b981' : '#ef4444'}`,
                color: feedback.type === 'success' ? '#34d399' : '#f87171',
                fontSize: 12,
              }}
            >
              {feedback.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Configuration Form */}
          <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <span className="form-label-row">Execution Environment</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setEnvironment('PAPER_TRADING')}
                  style={{
                    background: environment === 'PAPER_TRADING' ? 'var(--accent-subtle)' : 'var(--bg-surface-elevated)',
                    border: `1px solid ${environment === 'PAPER_TRADING' ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-xs)',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    textAlign: 'left',
                    color: environment === 'PAPER_TRADING' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  }}
                >
                  <div>Alpaca Paper (Real Feeds & Fills)</div>
                  <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2 }}>paper-api.alpaca.markets</div>
                </button>

                <button
                  type="button"
                  onClick={() => setEnvironment('LIVE')}
                  style={{
                    background: environment === 'LIVE' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface-elevated)',
                    border: `1px solid ${environment === 'LIVE' ? '#10b981' : 'var(--border-subtle)'}`,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-xs)',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    textAlign: 'left',
                    color: environment === 'LIVE' ? '#10b981' : 'var(--text-secondary)',
                  }}
                >
                  <div>Alpaca Live (Real Exchange Capital)</div>
                  <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2 }}>api.alpaca.markets</div>
                </button>
              </div>
            </div>

            <div className="form-group">
              <span className="form-label-row">Alpaca API Key ID (APCA-API-KEY-ID)</span>
              <div className="form-input-container">
                <input
                  type="text"
                  className="form-input num"
                  placeholder="PK..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={submitting}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="form-group">
              <span className="form-label-row">Alpaca Secret Key (APCA-API-SECRET-KEY)</span>
              <div className="form-input-container">
                <input
                  type="password"
                  className="form-input num"
                  placeholder="••••••••••••••••••••••••••••••••"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  disabled={submitting}
                  autoComplete="off"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || !apiKey || !apiSecret}
              style={{
                width: '100%',
                padding: '12px',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 600,
                marginTop: 4,
              }}
            >
              {submitting ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Loader size={16} className="animate-spin" />
                  <span>Validating API Keys against Alpaca...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Connect Real Alpaca Broker</span>
                  <ArrowRight size={15} />
                </div>
              )}
            </button>
          </form>

          {/* Institutional note */}
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-xs)',
              background: 'var(--bg-surface-elevated)',
              fontSize: 11,
              color: 'var(--text-tertiary)',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
            }}
          >
            <Shield size={16} color="var(--trade-buy)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong>Direct Market Execution Guaranteed:</strong> When Alpaca API keys are connected, all stock orders (AAPL, NVDA, SPX/SPY, TSLA) are submitted directly to Alpaca's matching engine for execution on NASDAQ/NYSE. When running in STP mode, orders execute against live exchange quotes with real transaction IDs.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
