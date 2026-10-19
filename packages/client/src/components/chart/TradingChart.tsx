import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { CandleData, Position, Order } from '@nexus/core';
import {
  TrendingUp,
  BarChart2,
  Maximize2,
  Minimize2,
  Activity,
  Layers,
  Settings,
} from 'lucide-react';

interface TradingChartProps {
  symbol: string;
  candles: CandleData[];
  currentPrice: number;
  openPosition?: Position;
  pendingOrder?: Order;
  onUpdateSlTp?: (sl?: number, tp?: number) => void;
}

export type ChartType = 'candlestick' | 'line' | 'area';
export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

export const TradingChart: React.FC<TradingChartProps> = ({
  symbol,
  candles,
  currentPrice,
  openPosition,
  pendingOrder,
  onUpdateSlTp,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [showMa, setShowMa] = useState<boolean>(true);
  const [showBands, setShowBands] = useState<boolean>(false);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Indicators calculation
  const ma20 = useMemo(() => {
    const period = 20;
    return candles.map((c, idx, arr) => {
      if (idx < period - 1) return null;
      let sum = 0;
      for (let i = 0; i < period; i++) {
        sum += arr[idx - i].close;
      }
      return sum / period;
    });
  }, [candles]);

  const bollingerBands = useMemo(() => {
    const period = 20;
    const stdDevMultiplier = 2;
    return candles.map((c, idx, arr) => {
      if (idx < period - 1) return null;
      let sum = 0;
      for (let i = 0; i < period; i++) {
        sum += arr[idx - i].close;
      }
      const mean = sum / period;
      let varianceSum = 0;
      for (let i = 0; i < period; i++) {
        varianceSum += Math.pow(arr[idx - i].close - mean, 2);
      }
      const stdDev = Math.sqrt(varianceSum / period);
      return {
        upper: mean + stdDev * stdDevMultiplier,
        middle: mean,
        lower: mean - stdDev * stdDevMultiplier,
      };
    });
  }, [candles]);

  // Render chart onto Canvas
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (candles.length === 0) return;

    const paddingRight = 65; // Price scale width
    const paddingBottom = 26; // Time scale height
    const chartWidth = width - paddingRight;
    const chartHeight = height - paddingBottom;

    // Calculate High & Low Price range
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;

    candles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVolume) maxVolume = c.volume;
    });

    // Add 2% breathing margin on prices
    const priceRange = maxPrice - minPrice || 1;
    minPrice -= priceRange * 0.03;
    maxPrice += priceRange * 0.03;
    const visiblePriceRange = maxPrice - minPrice;

    const priceToY = (price: number) => {
      return chartHeight - ((price - minPrice) / visiblePriceRange) * chartHeight;
    };

    const yToPrice = (y: number) => {
      return maxPrice - (y / chartHeight) * visiblePriceRange;
    };

    const candleCount = candles.length;
    const candleWidth = Math.max(2, chartWidth / candleCount - 2);
    const candleSpacing = chartWidth / candleCount;

    // 1. Draw Grid Lines
    ctx.strokeStyle = '#161e2a';
    ctx.lineWidth = 1;
    const gridRows = 6;
    for (let i = 0; i <= gridRows; i++) {
      const y = (chartHeight / gridRows) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Price label on right axis
      const priceAtY = yToPrice(y);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(priceAtY.toFixed(priceAtY > 500 ? 2 : 5), chartWidth + 6, y + 3);
    }

    const gridCols = 8;
    for (let i = 0; i <= gridCols; i++) {
      const x = (chartWidth / gridCols) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, chartHeight);
      ctx.stroke();
    }

    // 2. Draw Volume Histogram
    if (showVolume && maxVolume > 0) {
      const volumeHeight = chartHeight * 0.18;
      candles.forEach((c, i) => {
        const x = i * candleSpacing + candleSpacing / 2;
        const vHeight = (c.volume / maxVolume) * volumeHeight;
        const isUp = c.close >= c.open;
        ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)';
        ctx.fillRect(x - candleWidth / 2, chartHeight - vHeight, candleWidth, vHeight);
      });
    }

    // 3. Draw Bollinger Bands
    if (showBands) {
      ctx.beginPath();
      candles.forEach((_, i) => {
        const band = bollingerBands[i];
        if (!band) return;
        const x = i * candleSpacing + candleSpacing / 2;
        const yUpper = priceToY(band.upper);
        if (i === 19) ctx.moveTo(x, yUpper);
        else ctx.lineTo(x, yUpper);
      });
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      candles.forEach((_, i) => {
        const band = bollingerBands[i];
        if (!band) return;
        const x = i * candleSpacing + candleSpacing / 2;
        const yLower = priceToY(band.lower);
        if (i === 19) ctx.moveTo(x, yLower);
        else ctx.lineTo(x, yLower);
      });
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.stroke();
    }

    // 4. Draw Candlesticks / Line / Area
    if (chartType === 'candlestick') {
      candles.forEach((c, i) => {
        const x = i * candleSpacing + candleSpacing / 2;
        const openY = priceToY(c.open);
        const closeY = priceToY(c.close);
        const highY = priceToY(c.high);
        const lowY = priceToY(c.low);
        const isUp = c.close >= c.open;

        ctx.strokeStyle = isUp ? '#10b981' : '#f43f5e';
        ctx.fillStyle = isUp ? '#10b981' : '#f43f5e';
        ctx.lineWidth = 1;

        // Wick
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Body
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(1.5, Math.abs(openY - closeY));
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      });
    } else {
      // Line or Area chart
      ctx.beginPath();
      candles.forEach((c, i) => {
        const x = i * candleSpacing + candleSpacing / 2;
        const y = priceToY(c.close);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      if (chartType === 'area') {
        const lastX = (candles.length - 1) * candleSpacing + candleSpacing / 2;
        ctx.lineTo(lastX, chartHeight);
        ctx.lineTo(candleSpacing / 2, chartHeight);
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.35)');
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.0)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Stroke line
        ctx.beginPath();
        candles.forEach((c, i) => {
          const x = i * candleSpacing + candleSpacing / 2;
          const y = priceToY(c.close);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
      }
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 5. Draw MA(20) Line
    if (showMa) {
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
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 6. Draw Current Live Price Line & Tag
    const currentY = priceToY(currentPrice);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, currentY);
    ctx.lineTo(chartWidth, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Live Price Pill on Axis
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(chartWidth + 2, currentY - 10, paddingRight - 4, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(currentPrice.toFixed(currentPrice > 500 ? 2 : 5), chartWidth + 6, currentY + 4);

    // 7. Draw Open Position Overlay (if exists)
    if (openPosition) {
      const entryY = priceToY(openPosition.entryPrice);
      const isLong = openPosition.side === 'LONG';
      ctx.strokeStyle = isLong ? '#10b981' : '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, entryY);
      ctx.lineTo(chartWidth, entryY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Position Tag
      const pnl = openPosition.unrealizedPnl;
      const pnlText = `${isLong ? 'LONG' : 'SHORT'} ${openPosition.quantity} (${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)})`;
      ctx.fillStyle = isLong ? 'rgba(16, 185, 129, 0.9)' : 'rgba(244, 63, 94, 0.9)';
      ctx.fillRect(10, entryY - 11, ctx.measureText(pnlText).width + 14, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(pnlText, 16, entryY + 4);

      // Stop Loss Handle Line
      if (openPosition.stopLoss) {
        const slY = priceToY(openPosition.stopLoss);
        ctx.strokeStyle = '#ef4444';
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(0, slY);
        ctx.lineTo(chartWidth, slY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(chartWidth - 90, slY - 9, 85, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`SL: ${openPosition.stopLoss}`, chartWidth - 84, slY + 4);
      }

      // Take Profit Handle Line
      if (openPosition.takeProfit) {
        const tpY = priceToY(openPosition.takeProfit);
        ctx.strokeStyle = '#10b981';
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(0, tpY);
        ctx.lineTo(chartWidth, tpY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#10b981';
        ctx.fillRect(chartWidth - 90, tpY - 9, 85, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`TP: ${openPosition.takeProfit}`, chartWidth - 84, tpY + 4);
      }
    }

    // 8. Crosshair Cursor (if hover active)
    if (mousePos && mousePos.x < chartWidth && mousePos.y < chartHeight) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(mousePos.x, 0);
      ctx.lineTo(mousePos.x, chartHeight);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(chartWidth, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Floating axis price pill
      const hoverPrice = yToPrice(mousePos.y);
      ctx.fillStyle = '#334155';
      ctx.fillRect(chartWidth + 2, mousePos.y - 9, paddingRight - 4, 18);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '10px monospace';
      ctx.fillText(hoverPrice.toFixed(hoverPrice > 500 ? 2 : 5), chartWidth + 6, mousePos.y + 4);
    }
  }, [candles, currentPrice, chartType, showMa, showBands, showVolume, mousePos, openPosition, ma20, bollingerBands]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      canvas.width = container.clientWidth * window.devicePixelRatio;
      canvas.height = container.clientHeight * window.devicePixelRatio;
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      drawChart();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawChart]);

  // Redraw when state changes
  useEffect(() => {
    drawChart();
  }, [drawChart]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  return (
    <div className="pane chart-pane" ref={containerRef}>
      {/* Top Chart Toolbar */}
      <div className="chart-toolbar">
        <div className="toolbar-group">
          <div className="chart-symbol-badge">
            <span style={{ color: 'var(--text-primary)' }}>{symbol}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'normal' }}>Spot</span>
          </div>

          {(['1m', '5m', '15m', '1H', '4H', '1D'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              className={`timeframe-pill ${timeframe === tf ? 'active' : ''}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="toolbar-group">
          {/* Chart Style Toggles */}
          <button
            className={`timeframe-pill ${chartType === 'candlestick' ? 'active' : ''}`}
            onClick={() => setChartType('candlestick')}
            title="Candlestick Chart"
          >
            <BarChart2 size={13} style={{ verticalAlign: 'middle', marginRight: 3 }} />
            Candles
          </button>
          <button
            className={`timeframe-pill ${chartType === 'area' ? 'active' : ''}`}
            onClick={() => setChartType('area')}
            title="Area Chart"
          >
            <TrendingUp size={13} style={{ verticalAlign: 'middle', marginRight: 3 }} />
            Area
          </button>

          {/* Indicators Toggle */}
          <button
            className={`timeframe-pill ${showMa ? 'active' : ''}`}
            onClick={() => setShowMa(!showMa)}
            title="Moving Average (20)"
          >
            MA(20)
          </button>
          <button
            className={`timeframe-pill ${showBands ? 'active' : ''}`}
            onClick={() => setShowBands(!showBands)}
            title="Bollinger Bands"
          >
            BB
          </button>
          <button
            className={`timeframe-pill ${showVolume ? 'active' : ''}`}
            onClick={() => setShowVolume(!showVolume)}
            title="Volume Bars"
          >
            Vol
          </button>

          <button className="btn-icon" onClick={toggleFullscreen} title="Fullscreen Chart">
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="chart-canvas-container">
        <canvas
          ref={canvasRef}
          className="chart-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {/* Floating Quick Price HUD */}
        <div className="chart-hud-overlay">
          <span>O: {candles[candles.length - 1]?.open.toFixed(2) || '0.00'}</span>
          <span>H: {candles[candles.length - 1]?.high.toFixed(2) || '0.00'}</span>
          <span>L: {candles[candles.length - 1]?.low.toFixed(2) || '0.00'}</span>
          <span>C: {candles[candles.length - 1]?.close.toFixed(2) || '0.00'}</span>
          {showMa && (
            <span style={{ color: '#f59e0b' }}>
              MA: {ma20[ma20.length - 1]?.toFixed(2) || '0.00'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
