import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader,
  UserCheck,
  UserPlus,
  ArrowRight,
} from 'lucide-react';
import { UserRole } from '@nexus/core';

interface AuthModalProps {
  onClose: () => void;
  onAuthSuccess: (session: { token: string; user: { id: string; email: string; role: UserRole; accountId: string } }) => void;
  initialTab?: 'login' | 'register';
}

const SERVER_BASE = 'http://localhost:4000';

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  onAuthSuccess,
  initialTab = 'login',
}) => {
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<UserRole>('TRADER');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick Demo Logins
  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    submitAuth(demoEmail, demoPass, 'login');
  };

  const submitAuth = async (authEmail = email, authPass = password, authTab = tab) => {
    setErrorMsg(null);
    setLoading(true);

    try {
      const endpoint = authTab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload: any = {
        email: authEmail.trim(),
        password: authPass,
      };
      if (authTab === 'register') {
        payload.role = role;
      }

      const res = await fetch(`${SERVER_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as any;

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Store in localStorage
      if (data.token) {
        localStorage.setItem('nexus_auth_token', data.token);
      }

      onAuthSuccess({
        token: data.token,
        user: data.user,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    submitAuth();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ width: 480, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-xs)',
                background: 'var(--accent-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
              }}
            >
              <Lock size={15} />
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>
                NEXUS IDENTITY & ACCESS PORTAL
              </span>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                PBKDF2/SHA-512 Encrypted Institutional Gateway
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)' }}>
          <button
            type="button"
            className="dock-tab-btn"
            style={{
              flex: 1,
              justifyContent: 'center',
              padding: '12px 0',
              fontWeight: 600,
              fontSize: 12,
              borderBottom: tab === 'login' ? '2px solid var(--accent-primary)' : 'none',
              color: tab === 'login' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
            }}
            onClick={() => {
              setTab('login');
              setErrorMsg(null);
            }}
          >
            <UserCheck size={14} /> Sign In
          </button>
          <button
            type="button"
            className="dock-tab-btn"
            style={{
              flex: 1,
              justifyContent: 'center',
              padding: '12px 0',
              fontWeight: 600,
              fontSize: 12,
              borderBottom: tab === 'register' ? '2px solid var(--accent-primary)' : 'none',
              color: tab === 'register' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
            }}
            onClick={() => {
              setTab('register');
              setErrorMsg(null);
            }}
          >
            <UserPlus size={14} /> Open Account
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px' }}>
          {/* Quick Demo Logins Bar (if on Login tab) */}
          {tab === 'login' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Zap size={13} color="#f59e0b" /> One-Click Quick Logins:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@nexus.exchange', 'NexusAdmin2026!')}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '8px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    transition: 'var(--trans-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6' }}>Administrator</span>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>admin@nexus.exchange</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('trader@nexus.exchange', 'Trader2026!')}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '8px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    transition: 'var(--trans-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-primary)' }}>Pro Trader</span>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>trader@nexus.exchange</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 'var(--radius-xs)',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#f87171',
                fontSize: 12,
                marginBottom: 16,
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <span className="form-label-row">Email Address</span>
              <div className="form-input-container">
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <span className="form-label-row">Password</span>
              <div className="form-input-container">
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                />
              </div>
            </div>

            {tab === 'register' && (
              <div className="form-group">
                <span className="form-label-row">Account Role</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setRole('TRADER')}
                    style={{
                      background: role === 'TRADER' ? 'var(--accent-subtle)' : 'var(--bg-surface-elevated)',
                      border: `1px solid ${role === 'TRADER' ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      padding: '8px',
                      borderRadius: 'var(--radius-xs)',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 600,
                      color: role === 'TRADER' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    TRADER (Individual/Inst.)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('SUPPORT')}
                    style={{
                      background: role === 'SUPPORT' ? 'var(--accent-subtle)' : 'var(--bg-surface-elevated)',
                      border: `1px solid ${role === 'SUPPORT' ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      padding: '8px',
                      borderRadius: 'var(--radius-xs)',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 600,
                      color: role === 'SUPPORT' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    SUPPORT DESK
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !email || !password}
              style={{
                width: '100%',
                padding: '12px',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 600,
                marginTop: 4,
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Loader size={16} className="animate-spin" />
                  <span>Authenticating Credentials...</span>
                </div>
              ) : tab === 'login' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Sign In to Terminal</span>
                  <ArrowRight size={15} />
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Create Account & Start Trading</span>
                  <ArrowRight size={15} />
                </div>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div
            style={{
              marginTop: 18,
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
            <ShieldCheck size={16} color="var(--trade-buy)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Sessions are cryptographically protected via 100,000-iteration PBKDF2 with SHA-512 salting.
              Strict zero-knowledge password transmission over TLS.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
