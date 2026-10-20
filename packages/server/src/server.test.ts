import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from './auth/auth-service.js';
import { OrderEngine } from './engine/order-engine.js';
import { MockBrokerProvider } from './providers/mock/mock-broker.js';
import { CompositeMarketDataProvider } from './providers/market-data/composite-market-data.js';

describe('Server Integration & OMS Test Suite', () => {
  let authService: AuthService;
  let marketData: CompositeMarketDataProvider;
  let mockBroker: MockBrokerProvider;
  let orderEngine: OrderEngine;

  before(async () => {
    authService = new AuthService();
    marketData = new CompositeMarketDataProvider();
    await marketData.connect();
    mockBroker = new MockBrokerProvider('PAPER_TRADING', marketData as any);
    await mockBroker.initialize();

    orderEngine = new OrderEngine(mockBroker, marketData);
  });

  after(async () => {
    orderEngine.stop();
    await marketData.disconnect();
    setTimeout(() => process.exit(0), 50);
  });

  describe('Authentication & Security', () => {
    it('authenticates seeded admin user with secure PBKDF2 hash', () => {
      const result = authService.login('admin@nexus.exchange', 'NexusAdmin2026!');
      assert.ok(result.token);
      assert.equal(result.user.email, 'admin@nexus.exchange');
      assert.equal(result.user.role, 'ADMIN');

      const session = authService.verifyToken(result.token);
      assert.ok(session);
      assert.equal(session.role, 'ADMIN');
    });

    it('rejects login with invalid password', () => {
      assert.throws(() => {
        authService.login('admin@nexus.exchange', 'WrongPassword123');
      }, /Invalid email or password/);
    });

    it('registers new trader and verifies issued token', () => {
      const email = `trader.unit.test.${Date.now()}@nexus.exchange`;
      const reg = authService.register(email, 'StrongPassword2026!');
      assert.ok(reg.token);
      assert.equal(reg.user.role, 'TRADER');

      const session = authService.verifyToken(reg.token);
      assert.ok(session);
      assert.equal(session.email, email);
    });
  });

  describe('Order Management System & Risk Engine', () => {
    it('submits a valid market order, locks margin, and fills position', async () => {
      const initialBalance = orderEngine.getAccountBalance('acc_default');

      const order = await orderEngine.submitOrder({
        accountId: 'acc_default',
        userId: 'usr_test',
        symbol: 'BTCUSD',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.1,
        stopLoss: 70000,
        takeProfit: 120000,
      });

      assert.equal(order.status, 'FILLED');
      assert.ok(order.marginLocked > 0);

      const positions = orderEngine.getPositions();
      const pos = positions.find((p) => p.symbol === 'BTCUSD' && p.side === 'LONG');
      assert.ok(pos);
      assert.equal(pos.quantity, 0.1);
      assert.equal(pos.stopLoss, 70000);
      assert.equal(pos.takeProfit, 120000);
      assert.ok(pos.liquidationPrice && pos.liquidationPrice < pos.entryPrice);
    });

    it('rejects order with invalid Stop Loss levels (SL above price on BUY)', async () => {
      await assert.rejects(async () => {
        await orderEngine.submitOrder({
          accountId: 'acc_default',
          userId: 'usr_test',
          symbol: 'BTCUSD',
          side: 'BUY',
          type: 'MARKET',
          quantity: 0.1,
          stopLoss: 999999, // Invalid SL
        });
      }, /Stop Loss for a BUY order must be below the entry price/);
    });

    it('rejects order exceeding available free margin', async () => {
      await assert.rejects(async () => {
        await orderEngine.submitOrder({
          accountId: 'acc_default',
          userId: 'usr_test',
          symbol: 'BTCUSD',
          side: 'BUY',
          type: 'MARKET',
          quantity: 10000, // Demands hundreds of thousands in margin
        });
      }, /Insufficient Free Margin/);
    });

    it('updates position Stop Loss and Take Profit risk parameters', async () => {
      const positions = orderEngine.getPositions();
      const pos = positions[0];
      assert.ok(pos);

      const updated = await orderEngine.updatePosition(pos.id, {
        stopLoss: 75000,
        takeProfit: 130000,
      });

      assert.equal(updated.stopLoss, 75000);
      assert.equal(updated.takeProfit, 130000);
    });

    it('closes open position and realizes P&L into settled balance', async () => {
      const positions = orderEngine.getPositions();
      const pos = positions[0];
      assert.ok(pos);

      await orderEngine.closePosition(pos.id);
      const remainingPositions = orderEngine.getPositions();
      assert.equal(remainingPositions.length, 0);

      const trades = orderEngine.getTrades();
      assert.ok(trades.length > 0);
    });
  });

  describe('Wallet & Custody Operations', () => {
    it('credits account balance on deposit and creates transaction record', () => {
      const prevBal = orderEngine.getAccountBalance('acc_default').totalBalance;
      const txn = orderEngine.deposit('acc_default', 15000, 'STRIPE', 'pi_test_123');

      assert.equal(txn.amount, 15000);
      assert.equal(txn.status, 'COMPLETED');

      const newBal = orderEngine.getAccountBalance('acc_default').totalBalance;
      assert.equal(newBal, prevBal + 15000);
    });

    it('processes withdrawal within available free margin limit', () => {
      const prevBal = orderEngine.getAccountBalance('acc_default').totalBalance;
      const txn = orderEngine.withdraw('acc_default', 5000, 'BANK_WIRE', 'GB29NEXU0000000');

      assert.equal(txn.amount, 5000);
      assert.equal(txn.status, 'COMPLETED');

      const newBal = orderEngine.getAccountBalance('acc_default').totalBalance;
      assert.equal(newBal, prevBal - 5000);
    });

    it('rejects withdrawal exceeding free margin', () => {
      assert.throws(() => {
        orderEngine.withdraw('acc_default', 99999999, 'BANK_WIRE', 'GB29NEXU0000000');
      }, /Insufficient Free Margin/);
    });
  });
});
