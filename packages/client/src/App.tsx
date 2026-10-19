import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  EnvironmentMode,
  UserRole,
  TickerData,
  CandleData,
  Position,
  Order,
  Trade,
  OrderSide,
  OrderType,
  calculateUnrealizedPnl,
} from '@nexus/core';

import { TopNav } from './components/navigation/TopNav.js';
import { WatchlistPanel } from './components/watchlist/WatchlistPanel.js';
import { TradingChart } from './components/chart/TradingChart.js';
import { OrderEntryPanel } from './components/order/OrderEntryPanel.js';
import { BottomDock } from './components/dock/BottomDock.js';
import { OrderConfirmModal } from './components/order/OrderConfirmModal.js';
import { DepositModal } from './components/modals/DepositModal.js';
import { PortfolioModal } from './components/modals/PortfolioModal.js';
import { AdminModal } from './components/modals/AdminModal.js';

import { BarChart2, Star, TrendingUp, PieChart, User } from 'lucide-react';

interface AuditItem {
  id: string;
  time: string;
  action: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
}

export const App: React.FC = () => {
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Environment & Role State
  const [environment, setEnvironment] = useState<EnvironmentMode>('PAPER_TRADING');
  const [userRole, setUserRole] = useState<UserRole>('ADMIN'); // Default ADMIN so console is visible

  // Mobile View State
  const [mobileTab, setMobileTab] = useState<'markets' | 'watchlist' | 'trade' | 'portfolio' | 'account'>('trade');

  // Active Instrument
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSD');

  // Account Financial State
  const [balance, setBalance] = useState<number>(100000.0);
  const [leverage, setLeverage] = useState<number>(100);
  const [oneClickMode, setOneClickMode] = useState<boolean>(false);

  // Trading Collections
  const [positions, setPositions] = useState<Position[]>([]);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>([
    {
      id: 'aud_init_1',
      time: new Date().toLocaleTimeString(),
      action: 'SYSTEM_BOOT',
      details: 'Initialized Nexus Trading Engine in PAPER_TRADING mode. Leverage: 1:100.',
      status: 'SUCCESS',
    },
  ]);

  // Modals State
  const [pendingConfirmationOrder, setPendingConfirmationOrder] = useState<any | null>(null);
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState<boolean>(false);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);

  // Real-Time Market Data Tickers
  const [tickers, setTickers] = useState<Map<string, TickerData>>(() => {
    const map = new Map<string, TickerData>();
    const initial = [
      { symbol: 'BTCUSD', price: 94820.5, spread: 0.6, change: 1.45 },
      { symbol: 'ETHUSD', price: 3420.2, spread: 0.15, change: -0.32 },
      { symbol: 'EURUSD', price: 1.0842, spread: 0.0001, change: 0.21 },
      { symbol: 'GBPUSD', price: 1.2985, spread: 0.00015, change: 0.44 },
      { symbol: 'USDJPY', price: 154.6, spread: 0.015, change: -0.18 },
      { symbol: 'XAUUSD', price: 2714.5, spread: 0.25, change: 0.85 },
      { symbol: 'WTI', price: 78.4, spread: 0.03, change: -1.15 },
      { symbol: 'AAPL', price: 232.1, spread: 0.04, change: 1.12 },
      { symbol: 'NVDA', price: 141.5, spread: 0.05, change: 2.84 },
      { symbol: 'SPX', price: 5860.2, spread: 0.5, change: 0.65 },
    ];
    for (const item of initial) {
      const half = item.spread / 2;
      map.set(item.symbol, {
        symbol: item.symbol,
        lastPrice: item.price,
        bid: Number((item.price - half).toFixed(5)),
        ask: Number((item.price + half).toFixed(5)),
        spread: item.spread,
        volume24h: 15420.5,
        high24h: item.price * 1.02,
        low24h: item.price * 0.98,
        change24h: item.change,
        timestamp: Date.now(),
      });
    }
    return map;
  });

  const [flashingSymbols, setFlashingSymbols] = useState<Map<string, 'up' | 'down'>>(new Map());

  // Candles for Selected Symbol
  const [candles, setCandles] = useState<CandleData[]>([]);

  // Generate initial candles when symbol changes
  useEffect(() => {
    const ticker = tickers.get(selectedSymbol);
    if (!ticker) return;

    const basePrice = ticker.lastPrice;
    const generated: CandleData[] = [];
    let current = basePrice * 0.97;
    const now = Date.now();
    const count = 50;

    for (let i = count; i >= 0; i--) {
      const time = now - i * 15 * 60 * 1000;
      const change = (Math.random() - 0.49) * (basePrice * 0.003);
      const open = current;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * (basePrice * 0.001);
      const low = Math.min(open, close) - Math.random() * (basePrice * 0.001);
      const volume = Math.random() * 20 + 2;

      generated.push({
        timestamp: time,
        open: Number(open.toFixed(basePrice > 500 ? 2 : 5)),
        high: Number(high.toFixed(basePrice > 500 ? 2 : 5)),
        low: Number(low.toFixed(basePrice > 500 ? 2 : 5)),
        close: Number(close.toFixed(basePrice > 500 ? 2 : 5)),
        volume: Number(volume.toFixed(2)),
      });
      current = close;
    }
    setCandles(generated);
  }, [selectedSymbol]);

  // Real-Time Price Tick Simulator
  useEffect(() => {
    const interval = setInterval(() => {
      setTickers((prev) => {
        const next = new Map(prev);
        const newFlashes = new Map<string, 'up' | 'down'>();

        for (const [sym, ticker] of next.entries()) {
          // 40% chance of ticking on each cycle
          if (Math.random() < 0.4) {
            const isUp = Math.random() > 0.49;
            const deltaPct = (isUp ? 1 : -1) * (Math.random() * 0.0006);
            const newPrice = Number((ticker.lastPrice * (1 + deltaPct)).toFixed(5));
            const halfSpread = ticker.spread / 2;

            newFlashes.set(sym, isUp ? 'up' : 'down');

            next.set(sym, {
              ...ticker,
              lastPrice: newPrice,
              bid: Number((newPrice - halfSpread).toFixed(5)),
              ask: Number((newPrice + halfSpread).toFixed(5)),
              timestamp: Date.now(),
            });
          }
        }

        if (newFlashes.size > 0) {
          setFlashingSymbols(newFlashes);
          setTimeout(() => setFlashingSymbols(new Map()), 700);
        }

        return next;
      });
    }, 750);

    return () => clearInterval(interval);
  }, []);

  // Update Open Positions P&L continuously on ticker changes
  useEffect(() => {
    setPositions((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((pos) => {
        const ticker = tickers.get(pos.symbol);
        if (!ticker) return pos;
        const curPrice = pos.side === 'LONG' ? ticker.bid : ticker.ask;
        const pnl = calculateUnrealizedPnl(pos.side, pos.entryPrice, curPrice, pos.quantity);

        return {
          ...pos,
          currentPrice: curPrice,
          unrealizedPnl: pnl,
        };
      });
    });
  }, [tickers]);

  // Financial Portfolios Calculations
  const usedMargin = useMemo(() => {
    return positions.reduce((acc, p) => acc + p.margin, 0);
  }, [positions]);

  const unrealizedPnlTotal = useMemo(() => {
    return positions.reduce((acc, p) => acc + p.unrealizedPnl, 0);
  }, [positions]);

  const equity = useMemo(() => {
    return balance + unrealizedPnlTotal;
  }, [balance, unrealizedPnlTotal]);

  const freeMargin = useMemo(() => {
    return Math.max(0, equity - usedMargin);
  }, [equity, usedMargin]);

  const marginLevel = useMemo(() => {
    if (usedMargin <= 0) return 999999;
    return (equity / usedMargin) * 100;
  }, [equity, usedMargin]);

  const dailyPnl = unrealizedPnlTotal;

  // Toggle Theme
  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  // Order Submission Pipeline
  const handleOrderRequest = (orderParams: any) => {
    if (oneClickMode) {
      executeOrder(orderParams);
    } else {
      setPendingConfirmationOrder(orderParams);
    }
  };

  const handleConfirmOrder = (enableOneClick: boolean) => {
    if (!pendingConfirmationOrder) return;
    if (enableOneClick) setOneClickMode(true);
    executeOrder(pendingConfirmationOrder);
    setPendingConfirmationOrder(null);
  };

  const executeOrder = (orderParams: any) => {
    const ticker = tickers.get(orderParams.symbol);
    const executionPrice = orderParams.price || (orderParams.side === 'BUY' ? ticker?.ask : ticker?.bid) || 1;
    const internalId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Add Audit Log Entry
    const newLog: AuditItem = {
      id: `aud_${Date.now()}`,
      time: new Date().toLocaleTimeString(),
      action: 'ORDER_EXECUTION',
      details: `${orderParams.side} ${orderParams.quantity} ${orderParams.symbol} @ $${executionPrice.toFixed(2)}. Margin: $${orderParams.requiredMargin.toFixed(2)}`,
      status: 'SUCCESS',
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    // If Market Order -> Fill immediately and create Position
    if (orderParams.type === 'MARKET') {
      const positionSide = orderParams.side === 'BUY' ? 'LONG' : 'SHORT';
      const newPos: Position = {
        id: `pos_${Date.now()}`,
        accountId: 'acc_default',
        instrumentId: `inst_${orderParams.symbol}`,
        symbol: orderParams.symbol,
        side: positionSide,
        quantity: orderParams.quantity,
        entryPrice: executionPrice,
        currentPrice: executionPrice,
        unrealizedPnl: 0,
        realizedPnl: 0,
        margin: orderParams.requiredMargin,
        leverage,
        stopLoss: orderParams.stopLoss,
        takeProfit: orderParams.takeProfit,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setPositions((prev) => [newPos, ...prev]);

      // Add to Trade History
      const newTrade: Trade = {
        id: `trd_${Date.now()}`,
        orderId: internalId,
        accountId: 'acc_default',
        instrumentId: `inst_${orderParams.symbol}`,
        symbol: orderParams.symbol,
        side: orderParams.side,
        price: executionPrice,
        quantity: orderParams.quantity,
        fee: orderParams.estimatedFee,
        feeCurrency: 'USD',
        realizedPnl: 0,
        executedAt: new Date().toLocaleTimeString(),
      };
      setTradeHistory((prev) => [newTrade, ...prev]);
    } else {
      // Limit or Stop Order -> Add to Open Orders
      const newOrder: Order = {
        id: internalId,
        accountId: 'acc_default',
        instrumentId: `inst_${orderParams.symbol}`,
        symbol: orderParams.symbol,
        clientOrderId: internalId,
        side: orderParams.side,
        type: orderParams.type,
        quantity: orderParams.quantity,
        price: orderParams.price,
        stopLoss: orderParams.stopLoss,
        takeProfit: orderParams.takeProfit,
        filledQuantity: 0,
        fee: orderParams.estimatedFee,
        feeCurrency: 'USD',
        marginLocked: orderParams.requiredMargin,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setOpenOrders((prev) => [newOrder, ...prev]);
    }
  };

  // Close Position
  const handleClosePosition = (positionId: string) => {
    const pos = positions.find((p) => p.id === positionId);
    if (!pos) return;

    // Realize P&L
    setBalance((prev) => prev + pos.unrealizedPnl);

    // Record Closing Trade
    const closingTrade: Trade = {
      id: `trd_close_${Date.now()}`,
      orderId: `ord_close_${Date.now()}`,
      accountId: 'acc_default',
      instrumentId: pos.instrumentId,
      symbol: pos.symbol,
      side: pos.side === 'LONG' ? 'SELL' : 'BUY',
      price: pos.currentPrice,
      quantity: pos.quantity,
      fee: Number((pos.quantity * pos.currentPrice * 0.0005).toFixed(2)),
      feeCurrency: 'USD',
      realizedPnl: pos.unrealizedPnl,
      executedAt: new Date().toLocaleTimeString(),
    };

    setTradeHistory((prev) => [closingTrade, ...prev]);
    setPositions((prev) => prev.filter((p) => p.id !== positionId));

    // Audit Log
    setAuditLogs((prev) => [
      {
        id: `aud_${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        action: 'POSITION_CLOSED',
        details: `Closed ${pos.side} ${pos.quantity} ${pos.symbol} @ $${pos.currentPrice.toFixed(2)}. Realized P&L: ${pos.unrealizedPnl >= 0 ? '+' : ''}$${pos.unrealizedPnl.toFixed(2)}`,
        status: 'SUCCESS',
      },
      ...prev,
    ]);
  };

  // Cancel Working Order
  const handleCancelOrder = (orderId: string) => {
    setOpenOrders((prev) => prev.filter((o) => o.id !== orderId));
    setAuditLogs((prev) => [
      {
        id: `aud_${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        action: 'ORDER_CANCELLED',
        details: `Cancelled pending order ${orderId}`,
        status: 'SUCCESS',
      },
      ...prev,
    ]);
  };

  const currentSelectedTicker = tickers.get(selectedSymbol);
  const currentOpenPosition = positions.find((p) => p.symbol === selectedSymbol);

  return (
    <div className="nexus-terminal">
      {/* Top Navigation HUD */}
      <TopNav
        environment={environment}
        userRole={userRole}
        theme={theme}
        accountBalance={balance}
        equity={equity}
        tickers={tickers}
        onSelectSymbol={setSelectedSymbol}
        onToggleTheme={handleToggleTheme}
        onOpenDeposit={() => setShowDepositModal(true)}
        onOpenPortfolio={() => setShowPortfolioModal(true)}
        onOpenAdmin={() => setShowAdminModal(true)}
        onChangeEnvironment={setEnvironment}
      />

      {/* Main 4-Quadrant Workspace Grid */}
      <main className="workspace-grid">
        {/* Left: Markets & Watchlist */}
        <WatchlistPanel
          tickers={tickers}
          selectedSymbol={selectedSymbol}
          onSelectSymbol={setSelectedSymbol}
          flashingSymbols={flashingSymbols}
        />

        {/* Center: Interactive Pro Chart */}
        <TradingChart
          symbol={selectedSymbol}
          candles={candles}
          currentPrice={currentSelectedTicker?.lastPrice || 0}
          openPosition={currentOpenPosition}
        />

        {/* Right: Order Entry & Risk Calculator */}
        <OrderEntryPanel
          symbol={selectedSymbol}
          ticker={currentSelectedTicker}
          availableBalance={freeMargin}
          leverage={leverage}
          oneClickMode={oneClickMode}
          onToggleOneClick={setOneClickMode}
          onRequestOrder={handleOrderRequest}
        />

        {/* Bottom: Tabbed Workspace Dock */}
        <BottomDock
          positions={positions}
          openOrders={openOrders}
          tradeHistory={tradeHistory}
          auditLogs={auditLogs}
          equity={equity}
          usedMargin={usedMargin}
          freeMargin={freeMargin}
          marginLevel={marginLevel}
          dailyPnl={dailyPnl}
          onClosePosition={handleClosePosition}
          onCancelOrder={handleCancelOrder}
        />
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="mobile-nav-bar">
        <button
          className={`mobile-nav-item ${mobileTab === 'markets' ? 'active' : ''}`}
          onClick={() => setMobileTab('markets')}
        >
          <BarChart2 size={18} />
          <span>Markets</span>
        </button>
        <button
          className={`mobile-nav-item ${mobileTab === 'watchlist' ? 'active' : ''}`}
          onClick={() => setMobileTab('watchlist')}
        >
          <Star size={18} />
          <span>Watchlist</span>
        </button>
        <button
          className={`mobile-nav-item ${mobileTab === 'trade' ? 'active' : ''}`}
          onClick={() => setMobileTab('trade')}
        >
          <TrendingUp size={18} />
          <span>Trade</span>
        </button>
        <button
          className={`mobile-nav-item ${mobileTab === 'portfolio' ? 'active' : ''}`}
          onClick={() => setShowPortfolioModal(true)}
        >
          <PieChart size={18} />
          <span>Portfolio</span>
        </button>
        <button
          className={`mobile-nav-item ${mobileTab === 'account' ? 'active' : ''}`}
          onClick={() => setShowDepositModal(true)}
        >
          <User size={18} />
          <span>Account</span>
        </button>
      </nav>

      {/* Confirmation Modal */}
      {pendingConfirmationOrder && (
        <OrderConfirmModal
          order={pendingConfirmationOrder}
          onConfirm={handleConfirmOrder}
          onCancel={() => setPendingConfirmationOrder(null)}
        />
      )}

      {/* Deposit & Withdrawal Modal */}
      {showDepositModal && (
        <DepositModal
          balance={balance}
          onClose={() => setShowDepositModal(false)}
          onDepositSuccess={(amt, method) => {
            setBalance((prev) => prev + amt);
            setAuditLogs((prev) => [
              {
                id: `aud_${Date.now()}`,
                time: new Date().toLocaleTimeString(),
                action: 'DEPOSIT_PROCESSED',
                details: `Deposited $${amt.toFixed(2)} USD via ${method}`,
                status: 'SUCCESS',
              },
              ...prev,
            ]);
          }}
          onWithdrawSuccess={(amt, method) => {
            setBalance((prev) => prev - amt);
            setAuditLogs((prev) => [
              {
                id: `aud_${Date.now()}`,
                time: new Date().toLocaleTimeString(),
                action: 'WITHDRAWAL_REQUESTED',
                details: `Requested withdrawal of $${amt.toFixed(2)} USD via ${method}`,
                status: 'SUCCESS',
              },
              ...prev,
            ]);
          }}
        />
      )}

      {/* Portfolio Analytics Modal */}
      {showPortfolioModal && (
        <PortfolioModal
          balance={balance}
          equity={equity}
          usedMargin={usedMargin}
          freeMargin={freeMargin}
          dailyPnl={dailyPnl}
          positions={positions}
          onClose={() => setShowPortfolioModal(false)}
        />
      )}

      {/* Admin Dashboard Modal */}
      {showAdminModal && <AdminModal onClose={() => setShowAdminModal(false)} />}
    </div>
  );
};
