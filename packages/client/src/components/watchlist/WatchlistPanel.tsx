import React, { useState, useMemo } from 'react';
import { TickerData, AssetClass } from '@nexus/core';
import { Search, Star, Plus, MoreHorizontal } from 'lucide-react';

interface WatchlistPanelProps {
  tickers: Map<string, TickerData>;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  flashingSymbols?: Map<string, 'up' | 'down'>;
}

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({
  tickers,
  selectedSymbol,
  onSelectSymbol,
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Crypto' | 'Forex' | 'Stocks'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD', 'DOGEUSD', 'AAPL', 'NVDA'])
  );

  // Asset category mapping
  const symbolCategoryMap: Record<string, 'Crypto' | 'Forex' | 'Stocks'> = {
    BTCUSD: 'Crypto',
    ETHUSD: 'Crypto',
    SOLUSD: 'Crypto',
    BNBUSD: 'Crypto',
    XRPUSD: 'Crypto',
    DOGEUSD: 'Crypto',
    ADAUSD: 'Crypto',
    AVAXUSD: 'Crypto',
    LINKUSD: 'Crypto',
    DOTUSD: 'Crypto',
    NEARUSD: 'Crypto',
    EURUSD: 'Forex',
    GBPUSD: 'Forex',
    USDJPY: 'Forex',
    XAUUSD: 'Forex',
    WTI: 'Forex',
    AAPL: 'Stocks',
    NVDA: 'Stocks',
    SPX: 'Stocks',
  };

  // Curated asset logo rendering
  const renderAssetLogo = (symbol: string) => {
    switch (symbol) {
      case 'BTCUSD':
        return (
          <div className="watchlist-coin-icon" style={{ background: '#f7931a', color: '#fff' }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
              <path d="M15.7 10.3c.3-.8.2-1.8-.4-2.4-.7-.7-1.8-.9-2.8-.8V5h-1.8v2.1h-1.3V5H7.6v2.1H5.5v1.8h1.2c.4 0 .5.2.5.4v5.4c0 .2-.1.4-.5.4H5.5v1.8h2.1v2.1h1.8v-2.1h1.3v2.1h1.8v-2.1c1.8.1 3.2-.8 3.6-2.5.3-1.1-.1-2.2-.9-2.9.7-.3 1.2-1 1.4-1.9zM9.4 8.7h2.8c.8 0 1.5.3 1.5 1.1s-.7 1.1-1.5 1.1H9.4V8.7zm3.3 5.9H9.4v-2.4h3.3c.9 0 1.6.4 1.6 1.2s-.7 1.2-1.6 1.2z" />
            </svg>
          </div>
        );
      case 'ETHUSD':
        return (
          <div className="watchlist-coin-icon" style={{ background: '#627eea', color: '#fff' }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
              <path d="M12 2L4.5 14.5 12 18.8l7.5-4.3L12 2zm0 18.2l-7.5-4.4L12 22l7.5-6.2-7.5 4.4z" />
            </svg>
          </div>
        );
      case 'SOLUSD':
        return (
          <div className="watchlist-coin-icon" style={{ background: '#14f195', color: '#000' }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
              <path d="M5 16.5l3-3h11l-3 3H5zm0-6l3-3h11l-3 3H5zm3-3L5 4.5h11l3 3H8z" />
            </svg>
          </div>
        );
      case 'BNBUSD':
        return (
          <div className="watchlist-coin-icon" style={{ background: '#f3ba2f', color: '#000' }}>
            <span style={{ fontSize: 9, fontWeight: 900 }}>BNB</span>
          </div>
        );
      case 'XRPUSD':
        return (
          <div className="watchlist-coin-icon" style={{ background: '#23292f', color: '#fff' }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
              <path d="M19.3 4h-2.6l-4.7 4.7-4.7-4.7H4.7l6 6-6 6h2.6l4.7-4.7 4.7 4.7h2.6l-6-6 6-6z" />
            </svg>
          </div>
        );
      case 'DOGEUSD':
        return (
          <div className="watchlist-coin-icon" style={{ background: '#c2a633', color: '#fff' }}>
            <span style={{ fontSize: 11, fontWeight: 900, fontFamily: 'serif' }}>Ð</span>
          </div>
        );
      case 'ADAUSD':
        return (
          <div className="watchlist-coin-icon" style={{ background: '#0033ad', color: '#fff' }}>
            <span style={{ fontSize: 9, fontWeight: 900 }}>₳</span>
          </div>
        );
      case 'AVAXUSD':
        return (
          <div className="watchlist-coin-icon" style={{ background: '#e84142', color: '#fff' }}>
            <span style={{ fontSize: 9, fontWeight: 900 }}>▲</span>
          </div>
        );
      case 'LINKUSD':
        return (
          <div className="watchlist-coin-icon" style={{ background: '#375bd2', color: '#fff' }}>
            <span style={{ fontSize: 9, fontWeight: 900 }}>⬡</span>
          </div>
        );
      case 'DOTUSD':
        return (
          <div className="watchlist-coin-icon" style={{ background: '#e6007a', color: '#fff' }}>
            <span style={{ fontSize: 9, fontWeight: 900 }}>●</span>
          </div>
        );
      case 'NEARUSD':
        return (
          <div className="watchlist-coin-icon" style={{ background: '#000000', color: '#fff' }}>
            <span style={{ fontSize: 9, fontWeight: 900 }}>N</span>
          </div>
        );
      case 'AAPL':
        return (
          <div className="watchlist-coin-icon" style={{ background: '#64748b', color: '#fff' }}>
            <span style={{ fontSize: 9, fontWeight: 900 }}></span>
          </div>
        );
      case 'NVDA':
        return (
          <div className="watchlist-coin-icon" style={{ background: '#76b900', color: '#fff' }}>
            <span style={{ fontSize: 9, fontWeight: 900 }}>NV</span>
          </div>
        );
      case 'SPX':
        return (
          <div className="watchlist-coin-icon" style={{ background: '#8b5cf6', color: '#fff' }}>
            <span style={{ fontSize: 9, fontWeight: 900 }}>500</span>
          </div>
        );
      case 'EURUSD':
      default:
        return (
          <div className="watchlist-coin-icon" style={{ background: '#2563eb', color: '#fff' }}>
            <span style={{ fontSize: 9, fontWeight: 900 }}>€$</span>
          </div>
        );
    }
  };

  // Filtered symbols
  const filteredTickers = useMemo(() => {
    return Array.from(tickers.values()).filter((ticker) => {
      // Category filter
      if (activeTab !== 'All') {
        const cat = symbolCategoryMap[ticker.symbol];
        if (cat !== activeTab) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return ticker.symbol.toLowerCase().includes(query);
      }

      return true;
    });
  }, [tickers, activeTab, searchQuery]);

  const toggleFavorite = (e: React.MouseEvent, sym: string) => {
    e.stopPropagation();
    const updated = new Set(favorites);
    if (updated.has(sym)) {
      updated.delete(sym);
    } else {
      updated.add(sym);
    }
    setFavorites(updated);
  };

  return (
    <div className="pane watchlist-pane">
      {/* Watchlist Header */}
      <div className="watchlist-header">
        <span className="watchlist-title">Watchlist</span>
        <div className="watchlist-actions">
          <button className="watchlist-action-btn" title="Add instrument to watchlist">
            <Plus size={15} />
          </button>
          <button className="watchlist-action-btn" title="Watchlist options">
            <MoreHorizontal size={15} />
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="watchlist-filter-tabs">
        {(['All', 'Crypto', 'Forex', 'Stocks'] as const).map((tab) => (
          <button
            key={tab}
            className={`watchlist-tab-pill ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="watchlist-search-wrapper">
        <Search size={13} className="watchlist-search-icon" />
        <input
          type="text"
          className="watchlist-search-input"
          placeholder="Search symbols..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table Headers */}
      <div className="watchlist-table-header">
        <span className="wth-symbol">Symbol</span>
        <span className="wth-price">Price</span>
        <span className="wth-change">24h %</span>
      </div>

      {/* Symbol Rows */}
      <div className="watchlist-list-container">
        {filteredTickers.map((ticker) => {
          const isSelected = selectedSymbol === ticker.symbol;
          const isFav = favorites.has(ticker.symbol);
          const isPositive = ticker.change24h >= 0;

          // Format price
          const formattedPrice =
            ticker.lastPrice >= 500
              ? ticker.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : ticker.lastPrice >= 1
              ? ticker.lastPrice.toFixed(4)
              : ticker.lastPrice.toFixed(5);

          return (
            <div
              key={ticker.symbol}
              className={`watchlist-row ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectSymbol(ticker.symbol)}
            >
              {/* Star + Icon + Symbol */}
              <div className="watchlist-row-left">
                <button
                  type="button"
                  className="star-btn"
                  onClick={(e) => toggleFavorite(e, ticker.symbol)}
                  title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star
                    size={12}
                    fill={isFav ? '#eab308' : 'none'}
                    color={isFav ? '#eab308' : 'var(--text-tertiary)'}
                  />
                </button>
                {renderAssetLogo(ticker.symbol)}
                <span className="watchlist-symbol-name">{ticker.symbol}</span>
              </div>

              {/* Price */}
              <div className="watchlist-row-price num">
                {formattedPrice}
              </div>

              {/* 24h Change */}
              <div
                className="watchlist-row-change num"
                style={{ color: isPositive ? 'var(--trade-buy)' : 'var(--trade-sell)' }}
              >
                {isPositive ? '+' : ''}
                {ticker.change24h.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
