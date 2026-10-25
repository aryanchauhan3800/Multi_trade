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
  Home,
  TrendingUp,
  BarChart2,
  Briefcase,
  Activity,
  MoreHorizontal,
  Search,
  Bell,
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
  activeNavTab?: string;
  onSelectNavTab?: (tab: string) => void;
  serverStatus?: 'CHECKING' | 'WAKING_UP' | 'ONLINE' | 'OFFLINE';
  serverLatency?: number | null;
  serverCountdown?: number;
  onOpenServerStatus?: () => void;
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
  activeNavTab = 'trading',
  onSelectNavTab,
  serverStatus,
  serverLatency,
  serverCountdown,
  onOpenServerStatus,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const getUsername = () => {
    if (currentUser?.email) {
      return currentUser.email.split('@')[0];
    }
    return 'aryan3800cha';
  };

  const getInitials = () => {
    if (currentUser?.email) {
      const parts = currentUser.email.split('@')[0];
      return parts.substring(0, 2).toUpperCase();
    }
    return 'AR';
  };

  const navLinks = [
    { id: 'home', label: 'Home', icon: Home, action: onGoHome },
    { id: 'trading', label: 'Trading', icon: TrendingUp },
    { id: 'markets', label: 'Markets', icon: BarChart2 },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase, action: onOpenPortfolio },
    { id: 'analytics', label: 'Analytics', icon: Activity },
  ];

  return (
    <header className="top-nav">
      {/* Left: Brand & Navigation Links */}
      <div className="nav-left">
        {/* Brand Logo */}
        <div
          className="brand-badge"
          onClick={onGoHome}
          style={{ cursor: onGoHome ? 'pointer' : 'default' }}
          title={onGoHome ? 'Return to Nexus Home' : undefined}
        >
          <div className="brand-logo-icon">N</div>
          <span className="brand-title">NEXUS</span>
        </div>

        {/* Primary Navigation Links */}
        <nav className="nav-primary-links">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeNavTab === link.id;
            return (
              <button
                key={link.id}
                className={`top-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (link.action) {
                    link.action();
                  } else if (onSelectNavTab) {
                    onSelectNavTab(link.id);
                  }
                }}
              >
                <Icon size={14} />
                <span>{link.label}</span>
              </button>
            );
          })}

          {/* ... More Dropdown */}
          <div className="nav-more-container" ref={moreRef}>
            <button
              className="top-nav-link"
              onClick={() => setMoreMenuOpen((prev) => !prev)}
            >
              <MoreHorizontal size={14} />
              <span>More</span>
            </button>

            {moreMenuOpen && (
              <div className="nav-more-dropdown">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    onOpenBroker?.();
                  }}
                >
                  <Cpu size={14} />
                  <span>Broker Execution Gateway</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    onOpenAdmin();
                  }}
                >
                  <Shield size={14} />
                  <span>Admin Risk Console</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    onChangeEnvironment(environment === 'LIVE' ? 'PAPER_TRADING' : 'LIVE');
                  }}
                >
                  <span className="env-dot" style={{ background: environment === 'LIVE' ? '#10b981' : '#f59e0b' }}></span>
                  <span>Mode: {environment === 'LIVE' ? 'Live Real Money' : 'Paper Trading'}</span>
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Center: Search Symbols, Pairs, or Markets */}
      <div className="nav-center-search">
        <div className="top-search-bar">
          <Search size={14} className="top-search-icon" />
          <input
            type="text"
            className="top-search-input"
            placeholder="Search symbols, pairs, or markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <kbd className="search-shortcut-badge">⌘ K</kbd>
        </div>
      </div>

      {/* Right: Theme Toggle, Notifications & Profile */}
      <div className="nav-right">
        {/* Server Connection / Render Keep-Alive Status Pill */}
        {serverStatus && (
          <div
            className="server-status-pill"
            onClick={onOpenServerStatus}
            title={
              serverStatus === 'ONLINE'
                ? `Backend Online (Latency: ${serverLatency !== null ? serverLatency + 'ms' : 'Active'} • 10s Heartbeat Active)`
                : serverStatus === 'WAKING_UP'
                ? `Render Backend Waking Up: ~${serverCountdown || 50}s (Cold Start) • Pinging every 10s`
                : 'Connecting to Cloud Backend...'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: '16px',
              background:
                serverStatus === 'ONLINE'
                  ? 'rgba(16, 185, 129, 0.1)'
                  : serverStatus === 'WAKING_UP'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(148, 163, 184, 0.12)',
              border:
                serverStatus === 'ONLINE'
                  ? '1px solid rgba(16, 185, 129, 0.25)'
                  : serverStatus === 'WAKING_UP'
                  ? '1px solid rgba(245, 158, 11, 0.35)'
                  : '1px solid var(--border-subtle, #e2e8f0)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              color:
                serverStatus === 'ONLINE'
                  ? 'var(--trade-buy, #10b981)'
                  : serverStatus === 'WAKING_UP'
                  ? '#d97706'
                  : 'var(--text-secondary, #64748b)',
              transition: 'all 0.15s ease',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background:
                  serverStatus === 'ONLINE'
                    ? '#10b981'
                    : serverStatus === 'WAKING_UP'
                    ? '#f59e0b'
                    : '#94a3b8',
                boxShadow:
                  serverStatus === 'ONLINE'
                    ? '0 0 6px #10b981'
                    : serverStatus === 'WAKING_UP'
                    ? '0 0 6px #f59e0b'
                    : 'none',
              }}
            />
            <span style={{ fontFamily: 'var(--font-mono, monospace)', letterSpacing: '-0.01em' }}>
              {serverStatus === 'ONLINE'
                ? `${serverLatency !== null ? `${serverLatency}ms` : 'ONLINE'}`
                : serverStatus === 'WAKING_UP'
                ? `Waking ~${serverCountdown}s`
                : 'CONNECTING'}
            </span>
          </div>
        )}

        {/* Live Real Money Status Pill (Subtle & Clean) */}
        <div
          className="live-status-pill"
          onClick={onOpenBroker}
          title="Direct Institutional STP / Alpaca Live Gateway"
        >
          <span className="env-dot" style={{ background: environment === 'LIVE' ? '#10b981' : '#f59e0b' }}></span>
          <span style={{ fontSize: 11, fontWeight: 700, color: environment === 'LIVE' ? 'var(--trade-buy)' : '#f59e0b' }}>
            {environment === 'LIVE' ? 'LIVE' : 'PAPER'}
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          className="btn-icon"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Sun size={16} />}
        </button>

        {/* Notifications Bell */}
        <button className="btn-icon nav-bell-btn" title="System Alerts & Execution Notifications">
          <Bell size={16} />
          <span className="bell-badge-dot"></span>
        </button>

        {/* User Profile Hub */}
        {currentUser ? (
          <div className="nav-profile-container" ref={dropdownRef}>
            <div
              className="nav-user-pill"
              onClick={() => setProfileOpen((prev) => !prev)}
              title="Click to view Account & Identity details"
            >
              <div className="nav-user-avatar">
                {getInitials()}
              </div>
              <span className="nav-username">{getUsername()}</span>
              <ChevronDown size={13} color="var(--text-tertiary)" />
            </div>

            {/* Profile Dropdown Menu */}
            {profileOpen && (
              <div className="nav-profile-dropdown">
                <div className="nav-profile-header">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {currentUser.email}
                    </span>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: 10,
                        color: 'var(--trade-buy)',
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={12} /> Verified
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'flex', gap: 6, marginTop: 4 }}>
                    <span>UID: <strong className="num">{currentUser.id}</strong></span>
                    <span>•</span>
                    <span>ACC: <strong className="num">{currentUser.accountId}</strong></span>
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--trade-buy)',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      padding: '4px 8px',
                      borderRadius: 4,
                      marginTop: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <ShieldCheck size={12} />
                    <span>Real Money Session Active</span>
                  </div>
                </div>

                <div className="nav-profile-hud" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Settled Cash:</span>
                    <strong className="num" style={{ color: 'var(--trade-buy)' }}>${accountBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Portfolio Equity:</span>
                    <strong className="num">${equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
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
                  <span>Deposit & Custody Gateway</span>
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

                <button
                  className="nav-profile-item"
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenBroker?.();
                  }}
                >
                  <Cpu size={14} color="var(--trade-buy)" />
                  <span>Broker Route: {brokerName || 'Real STP'}</span>
                </button>

                {currentUser.role === 'ADMIN' && (
                  <button
                    className="nav-profile-item"
                    onClick={() => {
                      setProfileOpen(false);
                      onOpenAdmin();
                    }}
                    style={{ color: '#8b5cf6' }}
                  >
                    <Shield size={14} />
                    <span>Admin Risk Terminal</span>
                  </button>
                )}

                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />

                <button
                  className="nav-profile-item logout-item"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn-secondary"
              onClick={() => onOpenAuth('login')}
              style={{ fontSize: 11, padding: '5px 12px' }}
            >
              Sign In
            </button>
            <button
              className="btn-primary"
              onClick={() => onOpenAuth('register')}
              style={{ fontSize: 11, padding: '5px 12px' }}
            >
              Open Account
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
