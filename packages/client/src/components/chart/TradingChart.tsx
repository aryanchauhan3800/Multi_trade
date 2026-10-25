import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { CandleData, Position, Order } from '@nexus/core';
import {
  Maximize2,
  Minimize2,
  ChevronDown,
  Activity,
  Bell,
  RotateCcw,
  Settings,
  Camera,
  Plus,
  Edit3,
  Type,
  Brush,
  Ruler,
  Compass,
  Lock,
  Trash2,
} from 'lucide-react';

interface TradingChartProps {
  symbol: string;
  candles: CandleData[];
  currentPrice: number;
  openPosition?: Position;
  pendingOrder?: Order;
  timeframe?: Timeframe;
  onChangeTimeframe?: (tf: Timeframe) => void;
  onUpdateSlTp?: (sl?: number, tp?: number) => void;
  onUpdatePosition?: (positionId: string, updates: { stopLoss?: number; takeProfit?: number }) => void;
}

export type ChartType = 'candlestick' | 'line' | 'area';
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D' | '1W';

export interface SymbolMeta {
  name: string;
  iconBg: string;
  iconColor: string;
  label: string;
}

export const SYMBOL_METADATA: Record<string, SymbolMeta> = {
  BTCUSD: { name: 'Bitcoin / US Dollar', iconBg: '#f7931a', iconColor: '#ffffff', label: '₿' },
  ETHUSD: { name: 'Ethereum / US Dollar', iconBg: '#627eea', iconColor: '#ffffff', label: 'Ξ' },
  SOLUSD: { name: 'Solana / US Dollar', iconBg: '#14f195', iconColor: '#090d16', label: '◎' },
  BNBUSD: { name: 'BNB / US Dollar', iconBg: '#f3ba2f', iconColor: '#090d16', label: 'BNB' },
  XRPUSD: { name: 'Ripple XRP / US Dollar', iconBg: '#23292f', iconColor: '#ffffff', label: '✕' },
  DOGEUSD: { name: 'Dogecoin / US Dollar', iconBg: '#c2a633', iconColor: '#ffffff', label: 'Ð' },
  ADAUSD: { name: 'Cardano / US Dollar', iconBg: '#0033ad', iconColor: '#ffffff', label: '₳' },
  AVAXUSD: { name: 'Avalanche / US Dollar', iconBg: '#e84142', iconColor: '#ffffff', label: '▲' },
  LINKUSD: { name: 'Chainlink / US Dollar', iconBg: '#375bd2', iconColor: '#ffffff', label: '⬡' },
  DOTUSD: { name: 'Polkadot / US Dollar', iconBg: '#e6007a', iconColor: '#ffffff', label: '●' },
  NEARUSD: { name: 'NEAR Protocol / US Dollar', iconBg: '#000000', iconColor: '#ffffff', label: 'N' },
  EURUSD: { name: 'Euro / US Dollar', iconBg: '#003399', iconColor: '#ffffff', label: '€' },
  GBPUSD: { name: 'British Pound / US Dollar', iconBg: '#cf142b', iconColor: '#ffffff', label: '£' },
  USDJPY: { name: 'US Dollar / Japanese Yen', iconBg: '#b91c1c', iconColor: '#ffffff', label: '¥' },
  XAUUSD: { name: 'Spot Gold / US Dollar', iconBg: '#eab308', iconColor: '#090d16', label: 'Au' },
  WTI: { name: 'Crude Oil WTI', iconBg: '#334155', iconColor: '#ffffff', label: '🛢' },
  AAPL: { name: 'Apple Inc.', iconBg: '#0f172a', iconColor: '#ffffff', label: '' },
  NVDA: { name: 'NVIDIA Corporation', iconBg: '#76b900', iconColor: '#ffffff', label: 'N' },
  SPX: { name: 'S&P 500 Index', iconBg: '#dc2626', iconColor: '#ffffff', label: 'SPX' },
};

export const getSymbolMeta = (sym: string): SymbolMeta => {
  const upper = (sym || '').toUpperCase();
  return (
    SYMBOL_METADATA[upper] || {
      name: `${upper} / US Dollar`,
      iconBg: '#2563eb',
      iconColor: '#ffffff',
      label: upper.slice(0, 3),
    }
  );
};

export const TradingChart: React.FC<TradingChartProps> = ({
  symbol,
  candles,
  currentPrice,
  openPosition,
  timeframe: externalTimeframe,
  onChangeTimeframe,
  onUpdateSlTp,
  onUpdatePosition,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const symbolMeta = useMemo(() => getSymbolMeta(symbol), [symbol]);

  const [internalTimeframe, setInternalTimeframe] = useState<Timeframe>('15m');
  const activeTimeframe = externalTimeframe || internalTimeframe;
  const [showMa, setShowMa] = useState<boolean>(true);
  const [showVolume] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeDrawingTool, setActiveDrawingTool] = useState<string>('crosshair');

  // Interactive SL/TP Dragging State
  const [dragTarget, setDragTarget] = useState<'SL' | 'TP' | null>(null);
  const [dragPrice, setDragPrice] = useState<number | null>(null);
  const boundsRef = useRef({ minPrice: 0, maxPrice: 1, chartHeight: 1, chartWidth: 1 });

  // Format price utility
  const formatPrice = useCallback((p: number) => {
    if (!isFinite(p)) return '0.00';
    if (p >= 500) return p.toFixed(2);
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(5);
  }, []);

  // Moving Average 20
  const ma20 = useMemo(() => {
    const period = 20;
    return candles.map((_, idx, arr) => {
      if (idx < period - 1) return null;
      let sum = 0;
      for (let i = 0; i < period; i++) {
        sum += arr[idx - i].close;
      }
      return sum / period;
    });
  }, [candles]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Render chart onto Canvas
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.clearRect(0, 0, width, height);
    if (width <= 0 || height <= 0) return;

    // Detect theme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    if (!candles || candles.length === 0) {
      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Loading real-time candles for ${symbolMeta.name}...`, width / 2, height / 2);
      return;
    }

    const paddingRight = 65;
    const paddingBottom = 26;
    const paddingTop = 20;
    const chartWidth = width - paddingRight;
    const chartHeight = height - paddingBottom - paddingTop;

    const gridColor = isDark ? '#19212c' : '#f1f5f9';
    const textColor = isDark ? '#64748b' : '#94a3b8';
    const buyColor = '#10b981';
    const sellColor = '#ef4444';

    // Calculate Price Min & Max
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;

    candles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVolume) maxVolume = c.volume;
    });

    if (currentPrice > 0 && isFinite(minPrice) && isFinite(maxPrice)) {
      const candleAvg = (minPrice + maxPrice) / 2;
      // Sanity check: Only incorporate currentPrice if within 0.35x to 2.8x of candle average
      // to prevent cross-symbol price glitches from breaking the y-axis
      if (currentPrice >= candleAvg * 0.35 && currentPrice <= candleAvg * 2.8) {
        if (currentPrice < minPrice) minPrice = currentPrice;
        if (currentPrice > maxPrice) maxPrice = currentPrice;
      }
    }

    // Add padding to price scale
    const priceRange = maxPrice - minPrice || 1;
    minPrice -= priceRange * 0.05;
    maxPrice += priceRange * 0.05;
    const fullPriceRange = maxPrice - minPrice;

    boundsRef.current = { minPrice, maxPrice, chartHeight, chartWidth };

    const priceToY = (price: number) => {
      return paddingTop + chartHeight - ((price - minPrice) / fullPriceRange) * chartHeight;
    };

    // 1. Draw Subtle Grid Lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    const horizontalGridSteps = 6;
    for (let i = 0; i <= horizontalGridSteps; i++) {
      const y = paddingTop + (chartHeight / horizontalGridSteps) * i;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(y));
      ctx.lineTo(chartWidth, Math.round(y));
      ctx.stroke();

      // Right Axis Price Label
      const priceAtY = maxPrice - (i / horizontalGridSteps) * fullPriceRange;
      ctx.fillStyle = textColor;
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(formatPrice(priceAtY), chartWidth + 8, y + 4);
    }

    // Vertical Time Grid Lines
    const candleCount = candles.length;
    const candleSpacing = chartWidth / candleCount;
    const candleWidth = Math.max(2, candleSpacing * 0.7);

    const timeSteps = Math.max(4, Math.floor(chartWidth / 90));
    for (let i = 0; i <= timeSteps; i++) {
      const candleIdx = Math.floor((i / timeSteps) * (candleCount - 1));
      const c = candles[candleIdx];
      if (c) {
        const x = candleIdx * candleSpacing + candleSpacing / 2;
        ctx.beginPath();
        ctx.moveTo(Math.round(x), paddingTop);
        ctx.lineTo(Math.round(x), paddingTop + chartHeight);
        ctx.stroke();

        // X-Axis Time Label
        const date = new Date(c.timestamp || (c as any).time);
        const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        ctx.fillStyle = textColor;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(timeStr, x, height - 8);
      }
    }

    // 2. Draw Volume Bars
    if (showVolume && maxVolume > 0) {
      const volumeChartHeight = chartHeight * 0.22;
      candles.forEach((c, i) => {
        const isUp = c.close >= c.open;
        const x = i * candleSpacing + (candleSpacing - candleWidth) / 2;
        const barHeight = (c.volume / maxVolume) * volumeChartHeight;
        const y = paddingTop + chartHeight - barHeight;

        ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.28)' : 'rgba(239, 68, 68, 0.28)';
        ctx.fillRect(Math.round(x), Math.round(y), Math.round(candleWidth), Math.round(barHeight));
      });
    }

    // 3. Draw Japanese Candlesticks
    candles.forEach((c, i) => {
      const isUp = c.close >= c.open;
      const x = i * candleSpacing + (candleSpacing - candleWidth) / 2;
      const centerX = x + candleWidth / 2;

      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);
      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);

      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));

      const candleColor = isUp ? buyColor : sellColor;

      // Wick
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(Math.round(centerX), Math.round(highY));
      ctx.lineTo(Math.round(centerX), Math.round(lowY));
      ctx.stroke();

      // Body
      ctx.fillStyle = candleColor;
      ctx.fillRect(Math.round(x), Math.round(bodyTop), Math.round(candleWidth), Math.round(bodyHeight));
    });

    // 4. Draw Moving Average (MA 20) Line
    if (showMa && ma20.length > 0) {
      ctx.beginPath();
      let started = false;
      candles.forEach((_, i) => {
        const val = ma20[i];
        if (val === null) return;
        const x = i * candleSpacing + candleSpacing / 2;
        const y = priceToY(val);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // 5. Draw Live Price Horizontal Dotted Line & Tag
    if (currentPrice > 0) {
      const currentY = Math.round(priceToY(currentPrice));
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, currentY);
      ctx.lineTo(chartWidth, currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Live Price Pill on Right Axis (Royal Blue badge)
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(chartWidth + 2, currentY - 10, paddingRight - 4, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(formatPrice(currentPrice), chartWidth + 6, currentY + 4);
    }
  }, [candles, currentPrice, ma20, showMa, showVolume, symbol, formatPrice]);

  // Sync canvas size on resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasContainerRef.current || !canvasRef.current) return;
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvasRef.current.width = rect.width * dpr;
      canvasRef.current.height = rect.height * dpr;
      drawChart();
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (canvasContainerRef.current) {
      observer.observe(canvasContainerRef.current);
    }
    return () => observer.disconnect();
  }, [drawChart]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  const lastCandle = candles && candles.length > 0 ? candles[candles.length - 1] : null;
  const lastClose = lastCandle ? lastCandle.close : currentPrice;
  const prevClose = candles.length > 1 ? candles[candles.length - 2].close : lastClose;
  const candleChange = lastClose - prevClose;
  const candleChangePct = prevClose > 0 ? (candleChange / prevClose) * 100 : 0;
  const isUp = candleChange >= 0;

  // Drawing tools rail
  const drawingTools = [
    { id: 'crosshair', icon: Plus, title: 'Crosshair' },
    { id: 'trendline', icon: Edit3, title: 'Trendline' },
    { id: 'pitchfork', icon: Compass, title: 'Pitchfork' },
    { id: 'text', icon: Type, title: 'Text Note' },
    { id: 'brush', icon: Brush, title: 'Brush' },
    { id: 'measure', icon: Ruler, title: 'Measure / Ruler' },
    { id: 'lock', icon: Lock, title: 'Lock Tools' },
    { id: 'trash', icon: Trash2, title: 'Clear Drawings' },
  ];

  return (
    <div className="pane chart-pane" ref={containerRef}>
      {/* Top Chart Toolbar */}
      <div className="chart-header-row">
        {/* Left: Symbol Dropdown Pill */}
        <div className="chart-symbol-selector">
          <div
            className="chart-symbol-icon"
            style={{
              background: symbolMeta.iconBg,
              color: symbolMeta.iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: symbolMeta.label.length > 2 ? 8 : 11,
              fontWeight: 800,
            }}
          >
            {symbolMeta.label}
          </div>
          <span className="chart-symbol-title">{symbol}</span>
          <ChevronDown size={14} className="chart-chevron" />
        </div>

        {/* Timeframe Selector Pills */}
        <div className="chart-timeframe-group">
          {(['1m', '5m', '15m', '1h', '4h', '1D', '1W'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              type="button"
              className={`chart-timeframe-pill ${activeTimeframe === tf ? 'active' : ''}`}
              onClick={() => {
                setInternalTimeframe(tf);
                onChangeTimeframe?.(tf);
              }}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Right Tools: Indicators, Alert, Replay, Settings, Fullscreen, Camera */}
        <div className="chart-actions-group">
          <button
            type="button"
            className="chart-action-pill"
            onClick={() => setShowMa(!showMa)}
            title="Toggle Technical Indicators"
          >
            <Activity size={13} />
            <span>Indicators</span>
          </button>
          <button type="button" className="chart-action-pill" title="Set Price Alert">
            <Bell size={13} />
            <span>Alert</span>
          </button>
          <button type="button" className="chart-action-pill" title="Market Replay">
            <RotateCcw size={13} />
            <span>Replay</span>
          </button>
          <button type="button" className="chart-icon-btn" title="Chart Properties">
            <Settings size={14} />
          </button>
          <button
            type="button"
            className="chart-icon-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button type="button" className="chart-icon-btn" title="Take Screenshot">
            <Camera size={14} />
          </button>
        </div>
      </div>

      {/* Sub-header Legend Row */}
      <div className="chart-legend-row">
        <div className="chart-legend-left">
          <span className="legend-pair-title">{symbolMeta.name} · {activeTimeframe} · NEXUS</span>
          <span className="legend-live-dot"></span>
          <span className="legend-ohlc num">
            O<strong className="num">{lastCandle ? formatPrice(lastCandle.open) : '0.00'}</strong>{' '}
            H<strong className="num">{lastCandle ? formatPrice(lastCandle.high) : '0.00'}</strong>{' '}
            L<strong className="num">{lastCandle ? formatPrice(lastCandle.low) : '0.00'}</strong>{' '}
            C<strong className="num">{lastCandle ? formatPrice(lastCandle.close) : '0.00'}</strong>{' '}
            <span style={{ color: isUp ? 'var(--trade-buy)' : 'var(--trade-sell)' }}>
              {isUp ? '+' : ''}{candleChange.toFixed(2)} ({isUp ? '+' : ''}{candleChangePct.toFixed(2)}%)
            </span>
          </span>
        </div>

        {showMa && (
          <div className="chart-legend-ma">
            <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 600 }}>
              MA 20 close 0 <strong className="num">{ma20[ma20.length - 1] ? formatPrice(ma20[ma20.length - 1]!) : '0.00'}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Main Chart Body: Left Drawing Toolbar + Canvas */}
      <div className="chart-main-body">
        {/* Vertical Left Drawing Toolbar */}
        <aside className="chart-drawing-rail">
          {drawingTools.map((t) => {
            const Icon = t.icon;
            const isActive = activeDrawingTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`drawing-tool-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveDrawingTool(t.id)}
                title={t.title}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </aside>

        {/* Canvas Chart */}
        <div className="chart-canvas-container" ref={canvasContainerRef}>
          <canvas ref={canvasRef} className="chart-canvas" />

          {/* Bottom Left "TV" Watermark Badge */}
          <div className="chart-tv-badge" title="TradingView Engine">
            TV
          </div>
        </div>
      </div>
    </div>
  );
};
