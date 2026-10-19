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

import { TopNav, AuthUser } from './components/navigation/TopNav.js';
import { WatchlistPanel } from './components/watchlist/WatchlistPanel.js';
import { TradingChart, Timeframe } from './components/chart/TradingChart.js';
import { OrderEntryPanel } from './components/order/OrderEntryPanel.js';
import { BottomDock } from './components/dock/BottomDock.js';
import { OrderConfirmModal } from './components/order/OrderConfirmModal.js';
import { DepositModal } from './components/modals/DepositModal.js';
import { PortfolioModal } from './components/modals/PortfolioModal.js';
import { AdminModal } from './components/modals/AdminModal.js';
import { AuthModal } from './components/modals/AuthModal.js';
import { BrokerModal } from './components/modals/BrokerModal.js';
import { HomePage } from './components/home/HomePage.js';

import { BarChart2, Star, TrendingUp, PieChart, User, AlertTriangle } from 'lucide-react';

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
  const [userRole, setUserRole] = useState<UserRole>('TRADER');

  // Page View State: 'home' | 'terminal'
  const [currentView, setCurrentView] = useState<'home' | 'terminal'>('home');

  // Authentication & Identity State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

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
  const [showBrokerModal, setShowBrokerModal] = useState<boolean>(false);
  const [brokerStatus, setBrokerStatus] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Real-Time Market Data Tickers (100% Live Streamed, No Static Prices)
  const [tickers, setTickers] = useState<Map<string, TickerData>>(new Map());
  const [flashingSymbols, setFlashingSymbols] = useState<Map<string, 'up' | 'down'>>(new Map());
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');

  // WebSocket Connection Ref
  const wsRef = useRef<WebSocket | null>(null);

  // Sync state from server OMS
  const syncServerState = useCallback(() => {
    const token = localStorage.getItem('nexus_auth_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // 1. Account Summary
    fetch(`${SERVER_BASE}/api/account/summary`, { headers })
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

    // 6. Real Transaction Ledger
    fetch(`${SERVER_BASE}/api/wallet/transactions`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.transactions) {
          setTransactions(data.transactions);
        }
      })
      .catch(() => {});

    // 7. Broker Telemetry Status
    fetch(`${SERVER_BASE}/api/broker/status`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.status) {
          setBrokerStatus(data.status);
        }
      })
      .catch(() => {});
  }, []);

  // Initial Sync on Mount
  useEffect(() => {
    syncServerState();

    // Auto-restore authenticated session from localStorage
    const token = localStorage.getItem('nexus_auth_token');
    if (token) {
      fetch(`${SERVER_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.session) {
            const usr: AuthUser = {
              id: data.session.userId,
              email: data.session.email,
              role: data.session.role,
              accountId: data.session.accountId,
            };
            setCurrentUser(usr);
            setUserRole(usr.role);
          } else {
            localStorage.removeItem('nexus_auth_token');
          }
        })
        .catch(() => {});
    }

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

  const handleAuthSuccess = (session: { token: string; user: AuthUser; initialBalance?: number }) => {
    setCurrentUser(session.user);
    setUserRole(session.user.role);
    if (session.initialBalance !== undefined) {
      setBalance(session.initialBalance);
    }
    localStorage.setItem('nexus_auth_token', session.token);
    syncServerState();
    setAuditLogs((prev) => [
      {
        id: `aud_auth_${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        action: 'USER_AUTHENTICATED',
        details: `Active session established for ${session.user.email} (${session.user.role}). Account: ${session.user.accountId}${session.initialBalance ? ` with $${session.initialBalance.toLocaleString()} dynamic capital` : ''}.`,
        status: 'SUCCESS',
      },
      ...prev,
    ]);
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('nexus_auth_token');
    if (token) {
      try {
        await fetch(`${SERVER_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (_err) {}
    }
    localStorage.removeItem('nexus_auth_token');
    setCurrentUser(null);
    setUserRole('TRADER');
    setAuditLogs((prev) => [
      {
        id: `aud_logout_${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        action: 'USER_LOGOUT',
        details: 'Session invalidated. Terminal session terminated.',
        status: 'WARNING',
      },
      ...prev,
    ]);
  };

  // Fetch 100% Real-Time Candlesticks when Symbol or Timeframe changes
  useEffect(() => {
    fetch(`${SERVER_BASE}/api/markets/candles/${selectedSymbol}?timeframe=${timeframe}&limit=80`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.candles && data.candles.length > 0) {
          setCandles(data.candles);
        }
      })
      .catch(() => {});
  }, [selectedSymbol, timeframe]);

  // Connect to Real-Time WebSocket Gateway
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    const connectWs = () => {
      try {
        const ws = new WebSocket(WS_BASE);
        wsRef.current = ws;

        ws.onopen = async () => {
          let symbols = Array.from(tickers.keys());
          if (symbols.length === 0) {
            try {
              const res = await fetch(`${SERVER_BASE}/api/instruments`);
              const data = await res.json() as any;
              if (data && data.symbols) symbols = data.symbols;
            } catch (_err) {}
          }
          if (symbols.length === 0) {
            symbols = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD', 'DOGEUSD', 'EURUSD', 'GBPUSD', 'XAUUSD', 'WTI', 'AAPL', 'NVDA', 'SPX'];
          }

          const channels = [
            ...symbols.map((s) => `ticker:${s}`),
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

              // Real-time live candle tick progression on active chart
              if (ticker.symbol === selectedSymbol) {
                setCandles((prev) => {
                  if (!prev || prev.length === 0) return prev;
                  const lastIdx = prev.length - 1;
                  const lastCandle = prev[lastIdx];
                  const updatedCandle: CandleData = {
                    ...lastCandle,
                    close: ticker.lastPrice,
                    high: Math.max(lastCandle.high, ticker.lastPrice),
                    low: Math.min(lastCandle.low, ticker.lastPrice),
                    volume: Number((lastCandle.volume + 0.02).toFixed(4)),
                  };
                  return [...prev.slice(0, lastIdx), updatedCandle];
                });
              }
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
      const token = localStorage.getItem('nexus_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${SERVER_BASE}/api/orders`, {
        method: 'POST',
        headers,
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

  // Update Position SL/TP on Server OMS
  const handleUpdatePosition = async (positionId: string, updates: { stopLoss?: number; takeProfit?: number }) => {
    try {
      const res = await fetch(`${SERVER_BASE}/api/positions/${positionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json() as any;
        alert(data.error || 'Failed to update position risk parameters');
        return;
      }
      syncServerState();
    } catch (err: any) {
      alert(`Position update failure: ${err.message}`);
    }
  };

  const currentSelectedTicker = tickers.get(selectedSymbol);
  const currentOpenPosition = positions.find((p) => p.symbol === selectedSymbol);

  return (
    <div className="nexus-terminal">
      {currentView === 'home' ? (
        <HomePage
          tickers={tickers}
          theme={theme}
          currentUser={currentUser}
          onLaunchTerminal={(symbol) => {
            if (symbol) setSelectedSymbol(symbol);
            setCurrentView('terminal');
          }}
          onOpenAuth={(tab) => {
            setAuthModalTab(tab || 'login');
            setShowAuthModal(true);
          }}
          onToggleTheme={handleToggleTheme}
          onLogout={handleLogout}
        />
      ) : (
        <>
          {/* Top Navigation HUD */}
          <TopNav
            environment={environment}
            userRole={userRole}
            currentUser={currentUser}
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
            onOpenAuth={(tab) => {
              setAuthModalTab(tab || 'login');
              setShowAuthModal(true);
            }}
            onLogout={handleLogout}
            onGoHome={() => setCurrentView('home')}
            onOpenBroker={() => setShowBrokerModal(true)}
            brokerName={
              brokerStatus?.provider === 'ALPACA_LIVE'
                ? 'ALPACA LIVE'
                : brokerStatus?.provider === 'ALPACA_PAPER'
                ? 'ALPACA PAPER'
                : 'REAL BROKER: LIVE STP'
            }
          />

          {/* Institutional Margin Call / Stop-Out Alert Banner */}
          {marginLevel < 100 && (
            <div
              style={{
                background: marginLevel <= 50 ? '#dc2626' : '#d97706',
                color: '#ffffff',
                padding: '6px 16px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                letterSpacing: '0.04em',
                zIndex: 100,
              }}
            >
              <AlertTriangle size={15} />
              <span>
                {marginLevel <= 50
                  ? `CRITICAL STOP-OUT: Margin Level is ${marginLevel.toFixed(1)}% (<= 50.0%). Auto-liquidation of positions in progress!`
                  : `MARGIN CALL WARNING: Margin Level is ${marginLevel.toFixed(1)}% (< 100.0%). Deposit margin or reduce exposure immediately to prevent stop-out liquidation.`}
              </span>
            </div>
          )}

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
              timeframe={timeframe}
              onChangeTimeframe={setTimeframe}
              onUpdatePosition={handleUpdatePosition}
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
              transactions={transactions}
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
        </>
      )}

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
      {showAdminModal && (
        <AdminModal
          onClose={() => setShowAdminModal(false)}
          onRefreshParent={syncServerState}
        />
      )}

      {/* Identity & Authentication Portal Modal */}
      {showAuthModal && (
        <AuthModal
          initialTab={authModalTab}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {/* Real Broker Execution Gateway Modal */}
      {showBrokerModal && (
        <BrokerModal
          onClose={() => setShowBrokerModal(false)}
          onRefreshParent={syncServerState}
        />
      )}
    </div>
  );
};
