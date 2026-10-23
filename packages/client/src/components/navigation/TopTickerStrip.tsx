import React from 'react';
import { TickerData } from '@nexus/core';

interface TopTickerStripProps {
  tickers: Map<string, TickerData>;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

interface QuickSymbolConfig {
  symbol: string;
  name: string;
  iconBg: string;
  iconColor: string;
  iconSvg?: React.ReactNode;
}

export const TopTickerStrip: React.FC<TopTickerStripProps> = ({
  tickers,
  selectedSymbol,
  onSelectSymbol,
}) => {
  const cards: QuickSymbolConfig[] = [
    {
      symbol: 'BTCUSD',
      name: 'BTCUSD',
      iconBg: '#f7931a',
      iconColor: '#ffffff',
      iconSvg: (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M15.7 10.3c.3-.8.2-1.8-.4-2.4-.7-.7-1.8-.9-2.8-.8V5h-1.8v2.1h-1.3V5H7.6v2.1H5.5v1.8h1.2c.4 0 .5.2.5.4v5.4c0 .2-.1.4-.5.4H5.5v1.8h2.1v2.1h1.8v-2.1h1.3v2.1h1.8v-2.1c1.8.1 3.2-.8 3.6-2.5.3-1.1-.1-2.2-.9-2.9.7-.3 1.2-1 1.4-1.9zM9.4 8.7h2.8c.8 0 1.5.3 1.5 1.1s-.7 1.1-1.5 1.1H9.4V8.7zm3.3 5.9H9.4v-2.4h3.3c.9 0 1.6.4 1.6 1.2s-.7 1.2-1.6 1.2z" />
        </svg>
      ),
    },
    {
      symbol: 'ETHUSD',
      name: 'ETHUSD',
      iconBg: '#627eea',
      iconColor: '#ffffff',
      iconSvg: (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M12 2L4.5 14.5 12 18.8l7.5-4.3L12 2zm0 18.2l-7.5-4.4L12 22l7.5-6.2-7.5 4.4z" />
        </svg>
      ),
    },
    {
      symbol: 'SOLUSD',
      name: 'SOLUSD',
      iconBg: '#14f195',
      iconColor: '#000000',
      iconSvg: (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M5 16.5l3-3h11l-3 3H5zm0-6l3-3h11l-3 3H5zm3-3L5 4.5h11l3 3H8z" />
        </svg>
      ),
    },
    {
      symbol: 'DOGEUSD',
      name: 'DOGEUSD',
      iconBg: '#c2a633',
      iconColor: '#ffffff',
      iconSvg: (
        <span style={{ fontSize: 11, fontWeight: 900, fontFamily: 'serif' }}>Ð</span>
      ),
    },
    {
      symbol: 'XRPUSD',
      name: 'XRPUSD',
      iconBg: '#23292f',
      iconColor: '#ffffff',
      iconSvg: (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M19.3 4h-2.6l-4.7 4.7-4.7-4.7H4.7l6 6-6 6h2.6l4.7-4.7 4.7 4.7h2.6l-6-6 6-6z" />
        </svg>
      ),
    },
  ];

  // Draw clean mini sparkline SVG
  const renderSparkline = (isPositive: boolean) => {
    const strokeColor = isPositive ? '#10b981' : '#ef4444';
    const pathD = isPositive
      ? 'M 0 16 Q 15 18, 30 11 T 60 5 T 90 2'
      : 'M 0 4 Q 15 3, 30 10 T 60 14 T 90 18';

    return (
      <svg className="ticker-sparkline" width="90" height="22" viewBox="0 0 90 22" fill="none">
        <path
          d={pathD}
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <section className="top-ticker-strip">
      {cards.map((item) => {
        const ticker = tickers.get(item.symbol);
        const lastPrice = ticker ? ticker.lastPrice : 0;
        const change = ticker ? ticker.change24h : 0;
        const isPositive = change >= 0;
        const isSelected = selectedSymbol === item.symbol;

        // Format price
        const formattedPrice =
          lastPrice > 0
            ? lastPrice >= 500
              ? `$${lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : lastPrice >= 1
              ? `$${lastPrice.toFixed(4)}`
              : `$${lastPrice.toFixed(5)}`
            : '--.--';

        return (
          <div
            key={item.symbol}
            className={`top-ticker-card ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelectSymbol(item.symbol)}
            title={`Select ${item.symbol}`}
          >
            <div className="ticker-card-left">
              <div
                className="ticker-asset-badge"
                style={{ background: item.iconBg, color: item.iconColor }}
              >
                {item.iconSvg}
              </div>
              <div className="ticker-meta">
                <span className="ticker-symbol-name">{item.name}</span>
                <span className="ticker-current-price num">{formattedPrice}</span>
              </div>
            </div>

            <div className="ticker-card-right">
              {renderSparkline(isPositive)}
              <span
                className="ticker-change-badge num"
                style={{ color: isPositive ? 'var(--trade-buy)' : 'var(--trade-sell)' }}
              >
                {isPositive ? '+' : ''}
                {change.toFixed(2)}%
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
};
