import React, { useState, useEffect } from 'react';
import { TickerData, UserRole, PlatformMarketingData, AccountTierSpec } from '@nexus/core';
import { AuthUser } from '../navigation/TopNav.js';
import { API_BASE_URL } from '../../config';
import './HomePage.css';
import {
  Shield,
  Zap,
  TrendingUp,
  BarChart2,
  ArrowRight,
  ExternalLink,
  Lock,
  Wallet,
  RefreshCw,
  Award,
  CheckCircle2,
  Globe,
  Users,
  Cpu,
  Clock,
  Smartphone,
  Laptop,
  ChevronRight,
  Sparkles,
  DollarSign,
  Sliders,
  Flame,
  Sun,
  Moon,
  LogOut,
  UserCheck,
  UserPlus,
  Play,
} from 'lucide-react';

interface HomePageProps {
  tickers: Map<string, TickerData>;
  theme: 'dark' | 'light';
  currentUser: AuthUser | null;
  onLaunchTerminal: (symbol?: string) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

type MarketCategory = 'ALL' | 'FOREX' | 'CRYPTO' | 'COMMODITIES' | 'EQUITIES';

export const HomePage: React.FC<HomePageProps> = ({
  tickers,
  theme,
  currentUser,
  onLaunchTerminal,
  onOpenAuth,
  onToggleTheme,
  onLogout,
}) => {
  const [activeCategory, setActiveCategory] = useState<MarketCategory>('ALL');
  const [marketingData, setMarketingData] = useState<PlatformMarketingData | null>(null);
  const [tiers, setTiers] = useState<AccountTierSpec[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/platform/marketing`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setMarketingData(data);
      })
      .catch(() => {});

    fetch(`${API_BASE_URL}/api/platform/account-tiers`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.tiers) setTiers(data.tiers);
      })
      .catch(() => {});
  }, []);

  // Market Symbol metadata
  const symbolDetails: Record<string, { name: string; category: MarketCategory; baseSpread: number }> = {
    BTCUSD: { name: 'Bitcoin / US Dollar', category: 'CRYPTO', baseSpread: 0.1 },
    ETHUSD: { name: 'Ethereum / US Dollar', category: 'CRYPTO', baseSpread: 0.2 },
    SOLUSD: { name: 'Solana / US Dollar', category: 'CRYPTO', baseSpread: 0.2 },
    BNBUSD: { name: 'BNB / US Dollar', category: 'CRYPTO', baseSpread: 0.3 },
    XRPUSD: { name: 'Ripple / US Dollar', category: 'CRYPTO', baseSpread: 0.1 },
    DOGEUSD: { name: 'Dogecoin / US Dollar', category: 'CRYPTO', baseSpread: 0.4 },
    EURUSD: { name: 'Euro / US Dollar', category: 'FOREX', baseSpread: 0.6 },
    GBPUSD: { name: 'British Pound / US Dollar', category: 'FOREX', baseSpread: 0.8 },
    XAUUSD: { name: 'Gold Spot / US Dollar', category: 'COMMODITIES', baseSpread: 1.2 },
    WTI: { name: 'Crude Oil WTI Cash', category: 'COMMODITIES', baseSpread: 1.5 },
    AAPL: { name: 'Apple Inc. Common Stock', category: 'EQUITIES', baseSpread: 0.05 },
    NVDA: { name: 'Nvidia Corporation', category: 'EQUITIES', baseSpread: 0.08 },
    SPX: { name: 'S&P 500 Cash Index', category: 'EQUITIES', baseSpread: 0.4 },
  };

  const tickerArray = Array.from(tickers.values());

  const filteredTickers = tickerArray.filter((ticker) => {
    if (activeCategory === 'ALL') return true;
    const meta = symbolDetails[ticker.symbol];
    return meta && meta.category === activeCategory;
  });

  return (
    <div className="homepage-container">
      {/* 1. Global Navigation Bar */}
      <header className="home-nav">
        <div className="home-nav-left">
          <div className="home-brand-badge" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="home-brand-logo-icon">N</div>
            <span>NEXUS</span>
          </div>

          <nav className="home-nav-links">
            <a href="#markets" className="home-nav-link">Markets</a>
            <a href="#accounts" className="home-nav-link">Accounts & Spreads</a>
            <a href="#advantages" className="home-nav-link">Why Nexus</a>
            <a href="#platforms" className="home-nav-link">Platforms</a>
            <a href="#custody" className="home-nav-link">Deposit & Custody</a>
          </nav>
        </div>

        <div className="home-nav-right">
          {/* Theme switcher */}
          <button className="btn-icon" onClick={onToggleTheme} title="Toggle Theme">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: 'var(--accent-subtle)',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {currentUser.email.substring(0, 2).toUpperCase()}
                </div>
                <span>{currentUser.email.split('@')[0]}</span>
              </div>

              <button className="btn-primary" onClick={() => onLaunchTerminal()}>
                <Laptop size={14} /> Launch Terminal
              </button>

              <button className="btn-icon" onClick={onLogout} title="Sign Out">
                <LogOut size={14} color="#ef4444" />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn-secondary" onClick={() => onOpenAuth('login')}>
                <UserCheck size={14} /> Sign In
              </button>

              <button className="btn-primary" onClick={() => onOpenAuth('register')}>
                <UserPlus size={14} /> Open Account
              </button>

              <button
                className="btn-primary"
                onClick={() => onLaunchTerminal()}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  boxShadow: '0 0 12px rgba(139, 92, 246, 0.4)',
                }}
              >
                <Play size={13} fill="#ffffff" /> WebTerminal
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="home-hero">
        <div className="home-hero-badge">
          <Zap size={13} color="#f59e0b" />
          <span>{marketingData?.hero?.tagline || 'ZERO REQUOTES • RAW SPREADS FROM 0.0 PIPS • UP TO 1:1000 LEVERAGE'}</span>
        </div>

        <h1 className="home-hero-title">
          {marketingData?.hero?.headline ? (
            marketingData.hero.headline
          ) : (
            <>
              Institutional Multi-Asset Trading with <span className="home-hero-title-gradient">Ultra-Low Latency</span> & Deep Liquidity
            </>
          )}
        </h1>

        <p className="home-hero-subtitle">
          {marketingData?.hero?.subheadline ||
            'Execute 1,000+ Forex pairs, Cryptocurrencies, Gold, Crude Oil, and Global Equity Indices on the high-frequency NEXUS engine.'}
        </p>

        <div className="home-hero-actions">
          <button className="btn-hero-primary" onClick={() => onLaunchTerminal()}>
            <Laptop size={18} />
            <span>Launch Web Terminal</span>
            <ArrowRight size={16} />
          </button>

          <button className="btn-hero-secondary" onClick={() => onOpenAuth('register')}>
            <UserPlus size={18} />
            <span>Open Live Account</span>
          </button>

          <button
            className="btn-hero-secondary"
            onClick={() => onOpenAuth('register')}
            style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
          >
            <Sparkles size={16} />
            <span>Try Virtual Demo</span>
          </button>
        </div>

        {/* 4 Pillars Stats HUD */}
        <div className="home-hero-stats">
          {(marketingData?.stats || [
            { label: 'Execution in < 25ms', value: '99.4%' },
            { label: 'Raw Interbank Spreads', value: '0.0 Pips' },
            { label: 'Flexible Max Leverage', value: '1:1000' },
            { label: 'Negative Balance Protected', value: '100%' },
          ]).map((stat, idx) => (
            <div key={idx} className="home-hero-stat-card">
              <span className="home-hero-stat-val">{stat.value}</span>
              <span className="home-hero-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Live Streaming Ticker Strip */}
      <div className="home-ticker-strip">
        {tickerArray.map((t) => {
          const isUp = t.change24h >= 0;
          return (
            <div
              key={t.symbol}
              className="home-ticker-card"
              onClick={() => onLaunchTerminal(t.symbol)}
              title={`Click to trade ${t.symbol} on Terminal`}
            >
              <div className="home-ticker-top">
                <span className="home-ticker-sym">{t.symbol}</span>
                <span
                  style={{
                    color: isUp ? 'var(--trade-buy)' : 'var(--trade-sell)',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {isUp ? '+' : ''}
                  {t.change24h.toFixed(2)}%
                </span>
              </div>
              <div className="home-ticker-bottom">
                <span
                  className="home-ticker-price"
                  style={{ color: isUp ? 'var(--trade-buy)' : 'var(--trade-sell)' }}
                >
                  ${t.lastPrice.toLocaleString(undefined, { minimumFractionDigits: t.lastPrice > 500 ? 2 : 4 })}
                </span>
                <span className="home-ticker-spread">
                  Spr: {((t.ask - t.bid) * (t.symbol.includes('USD') && !t.symbol.includes('BTC') ? 10000 : 1)).toFixed(1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Interactive Live Markets Section (XM Architecture) */}
      <section id="markets" className="home-section">
        <div className="home-section-header">
          <div className="home-section-tag">REAL-TIME GLOBAL LIQUIDITY</div>
          <h2 className="home-section-title">Trade 1,000+ Markets with Industry-Leading Conditions</h2>
          <p className="home-section-desc">
            Explore live streaming prices and competitive spreads across global FX pairs, major cryptocurrencies, spot metals, energies, and indices.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="home-market-tabs">
          {(['ALL', 'FOREX', 'CRYPTO', 'COMMODITIES', 'EQUITIES'] as MarketCategory[]).map((cat) => (
            <button
              key={cat}
              className={`home-market-tab-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'ALL'
                ? 'All Instruments'
                : cat === 'FOREX'
                ? 'Forex Currencies'
                : cat === 'CRYPTO'
                ? 'Cryptocurrencies'
                : cat === 'COMMODITIES'
                ? 'Commodities & Gold'
                : 'Indices & Stocks'}
            </button>
          ))}
        </div>

        {/* Live Table */}
        <div className="home-market-table-wrap">
          <table className="home-market-table">
            <thead>
              <tr>
                <th>Instrument</th>
                <th>Bid Price</th>
                <th>Ask Price</th>
                <th>Spread</th>
                <th>24h Change</th>
                <th>24h High</th>
                <th>24h Low</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickers.map((t) => {
                const meta = symbolDetails[t.symbol] || { name: t.symbol, category: 'ALL', baseSpread: 0.5 };
                const isUp = t.change24h >= 0;
                const spreadFormatted = ((t.ask - t.bid) * (t.symbol.includes('EUR') || t.symbol.includes('GBP') ? 10000 : 1)).toFixed(1);

                return (
                  <tr key={t.symbol}>
                    <td>
                      <div className="home-market-symbol-box">
                        <div className="home-market-icon">
                          {t.symbol.substring(0, 3)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.symbol}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{meta.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      ${t.bid.toFixed(t.bid > 500 ? 2 : 4)}
                    </td>
                    <td className="num" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      ${t.ask.toFixed(t.ask > 500 ? 2 : 4)}
                    </td>
                    <td className="num" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                      {spreadFormatted} pips
                    </td>
                    <td className="num" style={{ color: isUp ? 'var(--trade-buy)' : 'var(--trade-sell)', fontWeight: 700 }}>
                      {isUp ? '+' : ''}{t.change24h.toFixed(2)}%
                    </td>
                    <td className="num" style={{ color: 'var(--text-secondary)' }}>
                      ${t.high24h.toFixed(t.high24h > 500 ? 2 : 4)}
                    </td>
                    <td className="num" style={{ color: 'var(--text-secondary)' }}>
                      ${t.low24h.toFixed(t.low24h > 500 ? 2 : 4)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="home-btn-trade"
                        onClick={() => onLaunchTerminal(t.symbol)}
                      >
                        Trade <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Account Types Comparison (XM Ultra-Low / Standard / Raw Zero) */}
      <section id="accounts" className="home-section" style={{ background: 'var(--bg-surface)' }}>
        <div className="home-section-header">
          <div className="home-section-tag">TAILORED FOR YOUR TRADING STYLE</div>
          <h2 className="home-section-title">Transparent Pricing & Flexible Account Types</h2>
          <p className="home-section-desc">
            Choose the ideal account tier suited to your strategy with zero hidden fees, flexible leverage up to 1:1000, and institutional execution.
          </p>
        </div>

        <div className="home-accounts-grid">
          {(tiers.length > 0
            ? tiers
            : [
                {
                  id: 'standard',
                  name: 'Nexus Standard',
                  description: 'Ideal for new and intermediate traders looking for commission-free trading with accessible entry.',
                  spreadDisplay: '1.0 Pips',
                  spreadUnit: 'Average Spread on Majors',
                  featured: false,
                  features: [
                    'Zero Commission on all trades ($0.00)',
                    'Minimum Deposit: $5.00',
                    'Leverage scaling up to 1:1000',
                    'Negative Balance Protection included',
                    'Hedging & Scalping fully allowed',
                  ],
                },
                {
                  id: 'ultra-low',
                  name: 'Nexus Ultra-Low',
                  badge: 'MOST POPULAR',
                  featured: true,
                  description: 'Built for active day traders, swing traders, and scalpers demanding tight spreads and zero commissions.',
                  spreadDisplay: '0.6 Pips',
                  spreadUnit: 'Ultra-Low Spreads on Majors',
                  features: [
                    'Zero Commission ($0.00 per lot)',
                    'Minimum Deposit: $50.00',
                    'Leverage scaling up to 1:1000',
                    'Direct DMA / STP order execution',
                    'Sub-25ms average latency',
                    'Negative Balance Protection included',
                  ],
                },
                {
                  id: 'raw-zero',
                  name: 'Nexus Raw Zero',
                  featured: false,
                  description: 'Institutional raw interbank spreads for quantitative traders, funds, algorithmic bots, and EAs.',
                  spreadDisplay: '0.0 Pips',
                  spreadUnit: 'Raw Interbank Spreads',
                  features: [
                    'Raw Spread from 0.0 + $3.50 commission',
                    'Minimum Deposit: $200.00',
                    'Leverage up to 1:500',
                    'Dedicated FIX 4.4 & WebSocket gateway',
                    'VIP Priority Customer Desk & VPS Hosting',
                  ],
                },
              ]
          ).map((tier) => (
            <div key={tier.id} className={`home-account-card ${tier.featured ? 'featured' : ''}`}>
              {tier.badge ? <div className="home-account-badge">{tier.badge}</div> : null}
              <h3 className="home-account-name">{tier.name}</h3>
              <p className="home-account-desc">{tier.description}</p>

              <div
                className="home-account-spread-hero"
                style={
                  tier.featured
                    ? { borderColor: 'var(--accent-primary)', background: 'var(--accent-subtle)' }
                    : undefined
                }
              >
                <div
                  className="home-account-spread-val"
                  style={tier.featured ? { color: 'var(--accent-primary)' } : undefined}
                >
                  {tier.spreadDisplay}
                </div>
                <div className="home-account-spread-lbl">{tier.spreadUnit}</div>
              </div>

              <ul className="home-account-features">
                {tier.features.map((feat, fidx) => (
                  <li key={fidx} className="home-account-feature-item">
                    <CheckCircle2 size={15} color={tier.featured ? 'var(--accent-primary)' : 'var(--trade-buy)'} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <button
                className={tier.featured ? 'btn-primary' : 'btn-secondary'}
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => onOpenAuth('register')}
              >
                Open {tier.name}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Execution Quality & Broker Advantages (XM Architecture) */}
      <section id="advantages" className="home-section">
        <div className="home-section-header">
          <div className="home-section-tag">WHY TRADE WITH NEXUS</div>
          <h2 className="home-section-title">Institutional Grade Infrastructure You Can Trust</h2>
          <p className="home-section-desc">
            Built from first principles for professional traders who refuse to compromise on execution speed, pricing transparency, and fund safety.
          </p>
        </div>

        <div className="home-advantages-grid">
          {(marketingData?.advantages || [
            { id: 'no-requotes', title: 'Strict No-Requotes Policy', description: '100% of trades are executed at the requested price or better. Zero artificial slippage, no dealer desk rejections, and no dealer intervention.' },
            { id: 'latency', title: 'Sub-25ms Order Execution', description: 'Equinix NY4 / LD4 cross-connected trading servers processing up to 50,000 orders per second with ultra-low latency fiber optics.' },
            { id: 'protection', title: 'Negative Balance Protection', description: 'Your downside risk is strictly limited to your deposited funds. Real-time margin calls trigger at 100% and auto-stop-out protects at 50%.' },
            { id: 'wallet', title: 'Unified Multi-Asset Wallet', description: 'Trade Crypto, FX, Gold, Oil, and US Equities from a single consolidated account balance with unified portfolio margin calculations.' },
            { id: 'security', title: 'PBKDF2/SHA-512 Security', description: 'Zero plain-text password storage. All credentials hashed with 100,000 iterations and authenticated over strictly encrypted TLS sessions.' },
            { id: 'liquidity', title: 'Tier-1 Segregated Liquidity', description: 'Direct DMA pricing aggregated from global Tier-1 investment banks and cryptocurrency market makers for maximum book depth.' },
          ]).map((adv, idx) => (
            <div key={adv.id || idx} className="home-advantage-card">
              <div className="home-advantage-icon">
                {idx === 0 ? <Clock size={22} /> : idx === 1 ? <Zap size={22} /> : idx === 2 ? <Shield size={22} /> : idx === 3 ? <Sliders size={22} /> : idx === 4 ? <Lock size={22} /> : <Award size={22} />}
              </div>
              <h4 className="home-advantage-title">{adv.title}</h4>
              <p className="home-advantage-desc">{adv.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Trading Platform Showcase */}
      <section id="platforms" className="home-section">
        <div className="home-platform-showcase">
          <div className="home-platform-info">
            <div className="home-platform-badge">TRADING ECOSYSTEM</div>
            <h3 className="home-platform-title">The NEXUS Web Terminal: High-Frequency Power in Your Browser</h3>
            <p className="home-platform-desc">
              No desktop software installations required. Access institutional-grade charting, live Level 2 order books, instant one-click order execution, and full margin analytics directly in any browser.
            </p>

            <ul className="home-platform-list">
              <li className="home-platform-list-item">
                <CheckCircle2 size={16} color="var(--trade-buy)" />
                <span>4-Quadrant split workspace with live tape and order entry</span>
              </li>
              <li className="home-platform-list-item">
                <CheckCircle2 size={16} color="var(--trade-buy)" />
                <span>Interactive lightweight candlestick charts with multi-timeframe analysis</span>
              </li>
              <li className="home-platform-list-item">
                <CheckCircle2 size={16} color="var(--trade-buy)" />
                <span>One-Click Trading with auto Stop-Loss & Take-Profit calculation</span>
              </li>
              <li className="home-platform-list-item">
                <CheckCircle2 size={16} color="var(--trade-buy)" />
                <span>Fully responsive on mobile, tablet, and ultra-wide trading setups</span>
              </li>
            </ul>

            <div style={{ marginTop: 12 }}>
              <button className="btn-hero-primary" onClick={() => onLaunchTerminal()}>
                <Laptop size={16} /> Open Web Terminal Now
              </button>
            </div>
          </div>

          {/* Live Interactive Preview Box */}
          <div
            className="home-platform-preview"
            onClick={() => onLaunchTerminal('BTCUSD')}
            style={{ cursor: 'pointer' }}
            title="Click to launch terminal with BTCUSD"
          >
            <div className="home-preview-hud">
              <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>NEXUS PRO TERMINAL v1.0</span>
              <span style={{ color: 'var(--trade-buy)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="env-dot" style={{ background: 'var(--trade-buy)' }}></span> LIVE FEED CONNECTED
              </span>
            </div>

            <div className="home-preview-grid">
              <div className="home-preview-box">
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>ACTIVE INSTRUMENT</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>BTC/USD</span>
                {tickers.get('BTCUSD') ? (
                  <span
                    style={{
                      fontSize: 12,
                      color: (tickers.get('BTCUSD')?.change24h || 0) >= 0 ? 'var(--trade-buy)' : 'var(--trade-sell)',
                      fontWeight: 700,
                    }}
                  >
                    ${tickers.get('BTCUSD')!.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (
                    {(tickers.get('BTCUSD')?.change24h || 0) >= 0 ? '+' : ''}
                    {(tickers.get('BTCUSD')?.change24h || 0).toFixed(2)}%)
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--trade-buy)', fontWeight: 700 }}>Connecting live feed...</span>
                )}
              </div>
              <div className="home-preview-box">
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>EXECUTION VENUE</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--trade-buy)' }}>STP / DMA</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  SPREAD: {tickers.get('BTCUSD') ? (tickers.get('BTCUSD')!.ask - tickers.get('BTCUSD')!.bid).toFixed(2) : '0.10'} USD
                </span>
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: 12, borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                <span>Order Execution Gateway</span>
                <span className="num" style={{ color: 'var(--trade-buy)' }}>Alpaca API v2 & STP Engine</span>
              </div>
              <div style={{ width: '100%', height: 4, background: 'var(--bg-surface-elevated)', borderRadius: 2 }}>
                <div style={{ width: '96%', height: '100%', background: 'var(--accent-primary)', borderRadius: 2 }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Deposit & Custody Section */}
      <section id="custody" className="home-section" style={{ background: 'var(--bg-surface)' }}>
        <div className="home-section-header">
          <div className="home-section-tag">INSTANT DEPOSIT & WITHDRAWAL</div>
          <h2 className="home-section-title">Zero Deposit Fees. Lightning-Fast Withdrawals.</h2>
          <p className="home-section-desc">
            Fund your trading account instantly via cryptocurrencies, credit cards, or international bank wire transfers.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {(marketingData?.custodyMethods || [
            { id: 'crypto', title: 'Crypto Custody', subtitle: 'USDT (TRC-20/ERC-20), BTC, ETH', fee: '0% Deposit Fee' },
            { id: 'cards', title: 'Cards & Mobile', subtitle: 'Visa, Mastercard, Apple Pay', fee: 'Instant Funding' },
            { id: 'wire', title: 'Bank Wire & SEPA', subtitle: 'Direct Bank Transfer (USD, EUR)', fee: 'Same-Day Settlement' },
            { id: 'segregated', title: 'Segregated Accounts', subtitle: 'Isolated Tier-1 Bank Storage', fee: '100% Protected' },
          ]).map((cust, idx) => (
            <div key={cust.id || idx} className="home-hero-stat-card">
              {idx === 0 ? (
                <Wallet size={24} color="var(--accent-primary)" style={{ marginBottom: 12 }} />
              ) : idx === 1 ? (
                <DollarSign size={24} color="#8b5cf6" style={{ marginBottom: 12 }} />
              ) : idx === 2 ? (
                <Globe size={24} color="#06b6d4" style={{ marginBottom: 12 }} />
              ) : (
                <Shield size={24} color="var(--trade-buy)" style={{ marginBottom: 12 }} />
              )}
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{cust.title}</span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{cust.subtitle}</span>
              <span style={{ fontSize: 11, color: 'var(--trade-buy)', marginTop: 8, fontWeight: 600 }}>{cust.fee}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 9. High-Conversion Call To Action Banner */}
      <section className="home-cta-banner">
        <h2 className="home-cta-title">Ready to Experience True Institutional Execution?</h2>
        <p className="home-cta-desc">
          Open your live account in 60 seconds or test your trading strategies completely risk-free with customizable virtual paper funds.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button className="btn-hero-primary" onClick={() => onOpenAuth('register')}>
            <UserPlus size={16} /> Open Live Account
          </button>

          <button className="btn-hero-secondary" onClick={() => onLaunchTerminal()}>
            <Laptop size={16} /> Launch WebTerminal
          </button>
        </div>
      </section>

      {/* 10. Global Footer */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div>
            <div className="home-brand-badge" style={{ marginBottom: 12 }}>
              <div className="home-brand-logo-icon">N</div>
              <span>NEXUS</span>
            </div>
            <p style={{ lineHeight: 1.6, maxWidth: 360, color: 'var(--text-tertiary)' }}>
              NEXUS is an institutional multi-asset exchange and prime brokerage platform delivering ultra-low latency execution, deep aggregated liquidity, and high-frequency trading capabilities.
            </p>
          </div>

          <div>
            <h5 className="home-footer-col-title">Markets</h5>
            <ul className="home-footer-links">
              <li><span className="home-footer-link" onClick={() => onLaunchTerminal('EURUSD')}>Forex Trading</span></li>
              <li><span className="home-footer-link" onClick={() => onLaunchTerminal('BTCUSD')}>Cryptocurrencies</span></li>
              <li><span className="home-footer-link" onClick={() => onLaunchTerminal('XAUUSD')}>Gold & Metals</span></li>
              <li><span className="home-footer-link" onClick={() => onLaunchTerminal('SPX')}>Stock Indices</span></li>
              <li><span className="home-footer-link" onClick={() => onLaunchTerminal('WTI')}>Crude Oil</span></li>
            </ul>
          </div>

          <div>
            <h5 className="home-footer-col-title">Accounts & Tools</h5>
            <ul className="home-footer-links">
              <li><span className="home-footer-link" onClick={() => onOpenAuth('register')}>Nexus Ultra-Low</span></li>
              <li><span className="home-footer-link" onClick={() => onOpenAuth('register')}>Raw Zero Account</span></li>
              <li><span className="home-footer-link" onClick={() => onLaunchTerminal()}>Web Trading Terminal</span></li>
              <li><span className="home-footer-link" onClick={() => onOpenAuth('login')}>Client Portal</span></li>
            </ul>
          </div>

          <div>
            <h5 className="home-footer-col-title">Security & Trust</h5>
            <ul className="home-footer-links">
              <li><span className="home-footer-link">Negative Balance Policy</span></li>
              <li><span className="home-footer-link">PBKDF2/SHA-512 Encryption</span></li>
              <li><span className="home-footer-link">Tier-1 Segregated Funds</span></li>
              <li><span className="home-footer-link">Execution Policy</span></li>
            </ul>
          </div>
        </div>

        <div className="home-footer-disclaimer">
          <p>
            <strong>Risk Warning:</strong> Trading CFDs, Forex, and derivative financial instruments carries a high degree of risk to your capital. Spreads and market fluctuations can work both to your advantage and disadvantage. You should not invest more capital than you can afford to lose. Before trading, please ensure you fully understand the risks involved and take into consideration your level of experience and investment objectives.
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, color: 'var(--text-tertiary)', fontSize: 11 }}>
            <span>© 2026 NEXUS Global Exchange Ltd. All rights reserved.</span>
            <span>Regulated Institutional Liquidity Gateway</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
