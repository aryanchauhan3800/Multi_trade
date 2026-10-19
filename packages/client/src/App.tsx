import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

const SERVER_BASE = 'http://localhost:4000';
const WS_BASE = 'ws://localhost:4000/ws/market';

export const App: React.FC = () => {
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Environment & Role State
  const [environment, setEnvironment] = useState<EnvironmentMode>('PAPER_TRADING');
  const [userRole, setUserRole] = useState<UserRole>('ADMIN');

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
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>([]);

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
  const [candles, setCandles] = useState<CandleData[]>([]);

  // WebSocket Connection Ref
  const wsRef = useRef<WebSocket | null>(null);

  // Sync state from server OMS
  const syncServerState = useCallback(() => {
    // 1. Account Summary
    fetch(`${SERVER_BASE}/api/account/summary`)
      .then((res) => (res.ok ? res.json() : null))
      .then((acc) => {
        if (acc && typeof acc.totalBalance === 'number') {
          setBalance(acc.totalBalance);
        }
      })
      .catch(() => {});

    // 2. Positions
    fetch(`${SERVER_BASE}/api/positions`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.positions) {
          setPositions(data.positions);
        }
      })
      .catch(() => {});

    // 3. Open Orders
    fetch(`${SERVER_BASE}/api/orders/open`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.orders) {
          setOpenOrders(data.orders);
        }
      })
      .catch(() => {});

    // 4. Trade History
    fetch(`${SERVER_BASE}/api/account/trades`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.trades) {
          setTradeHistory(data.trades);
        }
      })
      .catch(() => {});

    // 5. Audit Logs
    fetch(`${SERVER_BASE}/api/account/audit-logs`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.auditLogs) {
          setAuditLogs(data.auditLogs);
        }
      })
      .catch(() => {});
  }, []);

  // Initial Sync on Mount
  useEffect(() => {
    syncServerState();

    // Fetch initial tickers
    fetch(`${SERVER_BASE}/api/markets/tickers`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.tickers) {
          setTickers((prev) => {
            const next = new Map(prev);
            data.tickers.forEach((t: TickerData) => next.set(t.symbol, t));
            return next;
          });
        }
      })
      .catch(() => {});
  }, [syncServerState]);

  // Fetch Candlesticks when Selected Symbol Changes
  useEffect(() => {
    fetch(`${SERVER_BASE}/api/markets/candles/${selectedSymbol}?timeframe=15m&limit=60`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.candles && data.candles.length > 0) {
          setCandles(data.candles);
        } else {
          generateSyntheticCandles(selectedSymbol);
        }
      })
      .catch(() => {
        generateSyntheticCandles(selectedSymbol);
      });
  }, [selectedSymbol]);

  const generateSyntheticCandles = (sym: string) => {
    const ticker = tickers.get(sym);
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
  };

  // Connect to Real-Time WebSocket Gateway
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    const connectWs = () => {
      try {
        const ws = new WebSocket(WS_BASE);
        wsRef.current = ws;

        ws.onopen = () => {
          const allSymbols = Array.from(tickers.keys());
          const channels = [
            ...allSymbols.map((s) => `ticker:${s}`),
            `orderbook:${selectedSymbol}`,
            `trades:${selectedSymbol}`,
          ];

          ws.send(
            JSON.stringify({
              action: 'subscribe',
              channels,
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);

            if (msg.event === 'ticker.update' && msg.data) {
              const ticker: TickerData = msg.data;
              setTickers((prev) => {
                const next = new Map(prev);
                const old = next.get(ticker.symbol);
                if (old) {
                  const isUp = ticker.lastPrice >= old.lastPrice;
                  setFlashingSymbols((f) => {
                    const nf = new Map(f);
                    nf.set(ticker.symbol, isUp ? 'up' : 'down');
                    return nf;
                  });
                  setTimeout(() => {
                    setFlashingSymbols((f) => {
                      const nf = new Map(f);
                      nf.delete(ticker.symbol);
                      return nf;
                    });
                  }, 650);
                }
                next.set(ticker.symbol, ticker);
                return next;
              });
            }
          } catch (_err) {}
        };

        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (_err) {
        reconnectTimeout = setTimeout(connectWs, 3000);
      }
    };

    connectWs();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, [selectedSymbol]);

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
      executeOrderOnServer(orderParams);
    } else {
      setPendingConfirmationOrder(orderParams);
    }
  };

  const handleConfirmOrder = (enableOneClick: boolean) => {
    if (!pendingConfirmationOrder) return;
    if (enableOneClick) setOneClickMode(true);
    executeOrderOnServer(pendingConfirmationOrder);
    setPendingConfirmationOrder(null);
  };

  // Execute Order via Authenticated Server OMS
  const executeOrderOnServer = async (orderParams: any) => {
    try {
      const res = await fetch(`${SERVER_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: orderParams.symbol,
          side: orderParams.side,
          type: orderParams.type,
          quantity: orderParams.quantity,
          price: orderParams.price,
          stopLoss: orderParams.stopLoss,
          takeProfit: orderParams.takeProfit,
        }),
      });

      const data = await res.json() as any;

      if (!res.ok) {
        alert(data.error || 'Order rejected by risk engine');
        return;
      }

      // Sync updated positions, orders, balances from server
      syncServerState();
    } catch (err: any) {
      alert(`Server connection failure: ${err.message}`);
    }
  };

  // Close Position via Server OMS
  const handleClosePosition = async (positionId: string) => {
    try {
      const res = await fetch(`${SERVER_BASE}/api/positions/${positionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json() as any;
        alert(data.error || 'Failed to close position');
        return;
      }
      syncServerState();
    } catch (err: any) {
      alert(`Server communication error: ${err.message}`);
    }
  };

  // Cancel Working Order via Server OMS
  const handleCancelOrder = async (orderId: string) => {
    try {
      const res = await fetch(`${SERVER_BASE}/api/orders/${orderId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json() as any;
        alert(data.error || 'Failed to cancel order');
        return;
      }
      syncServerState();
    } catch (err: any) {
      alert(`Server communication error: ${err.message}`);
    }
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
            syncServerState();
          }}
          onWithdrawSuccess={(amt, method) => {
            setBalance((prev) => prev - amt);
            syncServerState();
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
