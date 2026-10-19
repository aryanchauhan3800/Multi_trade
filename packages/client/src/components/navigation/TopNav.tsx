import React, { useState, useRef, useEffect } from 'react';
import { EnvironmentMode, UserRole, TickerData } from '@nexus/core';
import {
  Moon,
  Sun,
  Wallet,
  PieChart,
  Shield,
  ChevronDown,
  User,
  LogOut,
  UserCheck,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Home,
  Cpu,
} from 'lucide-react';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  accountId: string;
}

interface TopNavProps {
  environment: EnvironmentMode;
  userRole: UserRole;
  currentUser: AuthUser | null;
  theme: 'dark' | 'light';
  accountBalance: number;
  equity: number;
  tickers: Map<string, TickerData>;
  onSelectSymbol: (symbol: string) => void;
  onToggleTheme: () => void;
  onOpenDeposit: () => void;
  onOpenPortfolio: () => void;
  onOpenAdmin: () => void;
  onChangeEnvironment: (env: EnvironmentMode) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onLogout: () => void;
  onGoHome?: () => void;
  onOpenBroker?: () => void;
  brokerName?: string;
}

export const TopNav: React.FC<TopNavProps> = ({
  environment,
  userRole,
  currentUser,
  theme,
  accountBalance,
  equity,
  tickers,
  onSelectSymbol,
  onToggleTheme,
  onOpenDeposit,
  onOpenPortfolio,
  onOpenAdmin,
  onChangeEnvironment,
  onOpenAuth,
  onLogout,
  onGoHome,
  onOpenBroker,
  brokerName,
}) => {
  const quickTapeSymbols = ['BTCUSD', 'EURUSD', 'XAUUSD'];
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [profileOpen]);

  const getEnvBadgeClass = () => {
    switch (environment) {
      case 'LIVE':
        return 'env-live';
      case 'PAPER_TRADING':
        return 'env-paper';
      case 'DEVELOPMENT':
      default:
        return 'env-dev';
    }
  };

  const getEnvLabel = () => {
    switch (environment) {
      case 'LIVE':
        return 'LIVE TRADING';
      case 'PAPER_TRADING':
        return 'PAPER TRADING';
      case 'DEVELOPMENT':
        return 'DEVELOPMENT';
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return '#8b5cf6';
      case 'SUPPORT':
        return '#10b981';
      case 'TRADER':
      default:
        return 'var(--accent-primary)';
    }
  };

  const getInitials = (email: string) => {
    if (!email) return 'NX';
    const parts = email.split('@')[0];
    return parts.substring(0, 2).toUpperCase();
  };

  return (
    <header className="top-nav">
      {/* Brand & Environment */}
      <div className="nav-left">
        <div
          className="brand-badge"
          onClick={onGoHome}
          style={{ cursor: onGoHome ? 'pointer' : 'default' }}
          title={onGoHome ? 'Return to Nexus Home' : undefined}
        >
          <div className="brand-logo-icon">N</div>
          <span>NEXUS</span>
        </div>

        {onGoHome && (
          <button
            className="btn-secondary"
            onClick={onGoHome}
            style={{ fontSize: 11, padding: '3px 8px', gap: 4 }}
            title="Return to Home Page"
          >
            <Home size={12} />
            <span>Home</span>
          </button>
        )}

        {/* Environment Mode Switcher */}
        <div
          className={`environment-pill ${getEnvBadgeClass()}`}
          onClick={() => {
            const next: EnvironmentMode =
              environment === 'PAPER_TRADING'
                ? 'LIVE'
                : environment === 'LIVE'
                ? 'DEVELOPMENT'
                : 'PAPER_TRADING';
            onChangeEnvironment(next);
          }}
          title="Click to switch trading environment"
        >
          <span className="env-dot"></span>
          <span>{getEnvLabel()}</span>
          <ChevronDown size={11} />
        </div>

        {/* Real Broker Execution Gateway Pill */}
        <div
          className="environment-pill"
          style={{
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            cursor: 'pointer',
          }}
          onClick={onOpenBroker}
          title="Click to configure Real Broker Execution (Alpaca Markets v2 / Live STP)"
        >
          <span className="env-dot" style={{ background: '#10b981' }}></span>
          <span>{brokerName || 'REAL BROKER: ALPACA / STP'}</span>
          <Cpu size={11} />
        </div>

        {/* Ticker Tape */}
        <div className="nav-ticker-tape">
          {quickTapeSymbols.map((sym) => {
            const ticker = tickers.get(sym);
            if (!ticker) return null;
            const isPositive = ticker.change24h >= 0;

            return (
              <div
                key={sym}
                className="ticker-tape-item"
                onClick={() => onSelectSymbol(sym)}
                title={`Click to open ${sym} chart`}
              >
                <span className="ticker-tape-symbol">{sym}</span>
                <span className="ticker-tape-price num">
                  ${ticker.lastPrice.toFixed(ticker.lastPrice > 500 ? 2 : 4)}
                </span>
                <span
                  className="ticker-tape-change num"
                  style={{ color: isPositive ? 'var(--trade-buy)' : 'var(--trade-sell)' }}
                >
                  {isPositive ? '+' : ''}
                  {ticker.change24h.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Account HUD & Actions */}
      <div className="nav-right">
        {/* Account Balance HUD */}
        <div className="account-hud">
          <div className="hud-stat">
            <span className="hud-label">Balance</span>
            <span className="hud-value">${accountBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="hud-stat" style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: 12 }}>
            <span className="hud-label">Equity</span>
            <span className="hud-value" style={{ color: equity >= accountBalance ? 'var(--trade-buy)' : 'var(--trade-sell)' }}>
              ${equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Deposit Funds CTA */}
        <button className="btn-primary" onClick={onOpenDeposit} title="Deposit & Custody Gateway">
          <Wallet size={14} /> Deposit
        </button>

        {/* Portfolio Button */}
        <button className="btn-icon" onClick={onOpenPortfolio} title="Portfolio Analytics">
          <PieChart size={15} />
        </button>

        {/* Admin Console (If Admin) */}
        {userRole === 'ADMIN' && (
          <button className="btn-icon" onClick={onOpenAdmin} title="Admin Risk Console" style={{ color: '#8b5cf6' }}>
            <Shield size={15} />
          </button>
        )}

        {/* Theme Switcher */}
        <button className="btn-icon" onClick={onToggleTheme} title="Toggle Theme">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Authentication & User Profile Hub */}
        {currentUser ? (
          <div className="nav-profile-container" ref={dropdownRef}>
            <div
              className="nav-user-pill"
              onClick={() => setProfileOpen((prev) => !prev)}
              title="Click to view Account & Identity details"
            >
              <div
                className="nav-user-avatar"
                style={{
                  background: `${getRoleColor(currentUser.role)}20`,
                  color: getRoleColor(currentUser.role),
                  border: `1px solid ${getRoleColor(currentUser.role)}40`,
                }}
              >
                {getInitials(currentUser.email)}
              </div>
              <span style={{ fontWeight: 600, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser.email.split('@')[0]}
              </span>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '2px 5px',
                  borderRadius: 3,
                  background: `${getRoleColor(currentUser.role)}22`,
                  color: getRoleColor(currentUser.role),
                  border: `1px solid ${getRoleColor(currentUser.role)}44`,
                  letterSpacing: '0.4px',
                }}
              >
                {currentUser.role}
              </span>
              <ChevronDown size={12} color="var(--text-tertiary)" />
            </div>

            {/* Profile Dropdown Menu */}
            {profileOpen && (
              <div className="nav-profile-dropdown">
                <div className="nav-profile-header">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {currentUser.email}
                    </span>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: 9,
                        color: 'var(--trade-buy)',
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={11} /> Verified
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'flex', gap: 6 }}>
                    <span>UID: <strong className="num">{currentUser.id}</strong></span>
                    <span>•</span>
                    <span>ACC: <strong className="num">{currentUser.accountId}</strong></span>
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: 'var(--trade-buy)',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      padding: '3px 6px',
                      borderRadius: 3,
                      marginTop: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <ShieldCheck size={11} />
                    <span>PBKDF2/SHA-512 Encrypted Session Active</span>
                  </div>
                </div>

                {/* Dropdown Items */}
                <button
                  className="nav-profile-item"
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenDeposit();
                  }}
                >
                  <Wallet size={14} color="var(--accent-primary)" />
                  <span>Deposit & Withdrawal Hub</span>
                </button>

                <button
                  className="nav-profile-item"
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenPortfolio();
                  }}
                >
                  <PieChart size={14} color="var(--accent-primary)" />
                  <span>Portfolio & Risk Analytics</span>
                </button>

                {currentUser.role === 'ADMIN' && (
                  <button
                    className="nav-profile-item"
                    onClick={() => {
                      setProfileOpen(false);
                      onOpenAdmin();
                    }}
                  >
                    <Shield size={14} color="#8b5cf6" />
                    <span>Administrator Console</span>
                  </button>
                )}

                <button
                  className="nav-profile-item"
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenBroker?.();
                  }}
                >
                  <Cpu size={14} color="#10b981" />
                  <span>Real Broker Execution Gateway</span>
                </button>

                <button
                  className="nav-profile-item"
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenAuth('login');
                  }}
                >
                  <RefreshCw size={14} color="var(--text-secondary)" />
                  <span>Switch Account / Sign In</span>
                </button>

                <div className="nav-profile-divider"></div>

                <button
                  className="nav-profile-item"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                  style={{ color: '#ef4444' }}
                >
                  <LogOut size={14} />
                  <span>Sign Out of Terminal</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              className="btn-secondary"
              onClick={() => onOpenAuth('login')}
              style={{ fontSize: 11, padding: '5px 10px' }}
            >
              <UserCheck size={13} /> Sign In
            </button>
            <button
              className="btn-primary"
              onClick={() => onOpenAuth('register')}
              style={{ fontSize: 11, padding: '5px 12px' }}
            >
              <UserPlus size={13} /> Open Account
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
