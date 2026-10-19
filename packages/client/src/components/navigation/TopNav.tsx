import React from 'react';
import { EnvironmentMode, UserRole, TickerData } from '@nexus/core';
import {
  Moon,
  Sun,
  Wallet,
  PieChart,
  Shield,
  Bell,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface TopNavProps {
  environment: EnvironmentMode;
  userRole: UserRole;
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
}

export const TopNav: React.FC<TopNavProps> = ({
  environment,
  userRole,
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
}) => {
  const quickTapeSymbols = ['BTCUSD', 'EURUSD', 'XAUUSD'];

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

  return (
    <header className="top-nav">
      {/* Brand & Environment */}
      <div className="nav-left">
        <div className="brand-badge">
          <div className="brand-logo-icon">N</div>
          <span>NEXUS</span>
        </div>

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
        <button className="btn-primary" onClick={onOpenDeposit}>
          <Wallet size={14} /> Deposit
        </button>

        {/* Portfolio Button */}
        <button className="btn-icon" onClick={onOpenPortfolio} title="Portfolio Analytics">
          <PieChart size={15} />
        </button>

        {/* Admin Console (If Admin) */}
        {userRole === 'ADMIN' && (
          <button className="btn-icon" onClick={onOpenAdmin} title="Admin Dashboard" style={{ color: '#8b5cf6' }}>
            <Shield size={15} />
          </button>
        )}

        {/* Theme Switcher */}
        <button className="btn-icon" onClick={onToggleTheme} title="Toggle Theme">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* User Role Badge */}
        <div
          style={{
            fontSize: '10px',
            fontWeight: 700,
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            padding: '4px 8px',
            borderRadius: 'var(--radius-xs)',
            letterSpacing: '0.4px',
            color: 'var(--text-secondary)',
          }}
        >
          {userRole}
        </div>
      </div>
    </header>
  );
};
