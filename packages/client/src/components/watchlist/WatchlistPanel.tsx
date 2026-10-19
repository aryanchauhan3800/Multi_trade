import React, { useState, useMemo } from 'react';
import { TickerData, AssetClass } from '@nexus/core';
import { Search, Star, ArrowUpRight, ArrowDownRight, Plus, SlidersHorizontal } from 'lucide-react';

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
  flashingSymbols = new Map(),
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['BTCUSD', 'EURUSD', 'XAUUSD']));

  // Instrument category mapping
  const symbolCategoryMap: Record<string, AssetClass> = {
    BTCUSD: 'CRYPTO',
    ETHUSD: 'CRYPTO',
    EURUSD: 'FOREX',
    GBPUSD: 'FOREX',
    USDJPY: 'FOREX',
    XAUUSD: 'COMMODITIES',
    WTI: 'COMMODITIES',
    AAPL: 'STOCKS',
    NVDA: 'STOCKS',
    SPX: 'INDICES',
  };

  const tickerList = useMemo(() => {
    return Array.from(tickers.values()).filter((ticker) => {
      // Category filter
      if (activeCategory === 'FAVORITES') {
        if (!favorites.has(ticker.symbol)) return false;
      } else if (activeCategory !== 'ALL') {
        const cat = symbolCategoryMap[ticker.symbol];
        if (cat !== activeCategory) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return ticker.symbol.toLowerCase().includes(query);
      }

      return true;
    });
  }, [tickers, activeCategory, searchQuery, favorites]);

  const toggleFavorite = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    const updated = new Set(favorites);
    if (updated.has(symbol)) {
      updated.delete(symbol);
    } else {
      updated.add(symbol);
    }
    setFavorites(updated);
  };

  return (
    <div className="pane watchlist-pane">
      {/* Category Tabs */}
      <div className="market-tabs">
        {['ALL', 'FAVORITES', 'CRYPTO', 'FOREX', 'STOCKS', 'COMMODITIES'].map((cat) => (
          <button
            key={cat}
            className={`market-tab-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat === 'FAVORITES' ? <Star size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} /> : null}
            {cat}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="search-input-wrapper">
        <Search size={13} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search symbols..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table Container */}
      <div className="watchlist-table-container">
        <table className="watchlist-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Bid</th>
              <th>Ask</th>
              <th>Spread</th>
              <th>24h %</th>
            </tr>
          </thead>
          <tbody>
            {tickerList.map((ticker) => {
              const isSelected = ticker.symbol === selectedSymbol;
              const flash = flashingSymbols.get(ticker.symbol);
              const isPositive = ticker.change24h >= 0;
              const flashClass = flash === 'up' ? 'tick-flash-up' : flash === 'down' ? 'tick-flash-down' : '';

              return (
                <tr
                  key={ticker.symbol}
                  className={`watchlist-row ${isSelected ? 'selected' : ''} ${flashClass}`}
                  onClick={() => onSelectSymbol(ticker.symbol)}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        onClick={(e) => toggleFavorite(e, ticker.symbol)}
                        style={{
                          cursor: 'pointer',
                          color: favorites.has(ticker.symbol) ? '#f59e0b' : 'var(--text-disabled)',
                        }}
                      >
                        <Star size={11} fill={favorites.has(ticker.symbol) ? '#f59e0b' : 'none'} />
                      </span>
                      <span style={{ fontWeight: 600 }}>{ticker.symbol}</span>
                    </div>
                  </td>
                  <td className="num">{ticker.bid.toFixed(ticker.bid > 500 ? 2 : 5)}</td>
                  <td className="num">{ticker.ask.toFixed(ticker.ask > 500 ? 2 : 5)}</td>
                  <td>
                    <span className="spread-pill num">{ticker.spread.toFixed(ticker.spread > 10 ? 1 : 4)}</span>
                  </td>
                  <td className="num" style={{ color: isPositive ? 'var(--trade-buy)' : 'var(--trade-sell)' }}>
                    {isPositive ? '+' : ''}
                    {ticker.change24h.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
