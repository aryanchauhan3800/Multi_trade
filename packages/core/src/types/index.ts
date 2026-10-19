// Domain Types for Nexus Trading Platform

export type EnvironmentMode = 'DEVELOPMENT' | 'PAPER_TRADING' | 'LIVE';

export type UserRole = 'USER' | 'TRADER' | 'SUPPORT' | 'ADMIN';

export type AssetClass = 'FOREX' | 'CRYPTO' | 'STOCKS' | 'INDICES' | 'COMMODITIES';

export type OrderSide = 'BUY' | 'SELL';

export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';

export type OrderStatus =
  | 'PENDING'
  | 'OPEN'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXPIRED';

export type PositionSide = 'LONG' | 'SHORT';

export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRADE_COMMISSION'
  | 'REALIZED_PNL'
  | 'TRANSFER'
  | 'ADJUSTMENT';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  userId: string;
  accountNumber: string;
  currency: string;
  environment: EnvironmentMode;
  leverage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Balance {
  id: string;
  accountId: string;
  currency: string;
  total: number;
  available: number;
  locked: number; // Used margin
  updatedAt: string;
}

export interface Instrument {
  id: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  name: string;
  assetClass: AssetClass;
  lotSize: number;
  minQuantity: number;
  maxQuantity: number;
  quantityStep: number;
  priceTickSize: number;
  spreadMarkup: number;
  isTradable: boolean;
}

export interface Order {
  id: string;
  providerId?: string;
  accountId: string;
  instrumentId: string;
  symbol: string;
  clientOrderId: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  filledQuantity: number;
  averageFillPrice?: number;
  fee: number;
  feeCurrency: string;
  marginLocked: number;
  status: OrderStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  accountId: string;
  instrumentId: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  margin: number;
  leverage: number;
  liquidationPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Trade {
  id: string;
  providerId?: string;
  orderId: string;
  accountId: string;
  instrumentId: string;
  symbol: string;
  side: OrderSide;
  price: number;
  quantity: number;
  fee: number;
  feeCurrency: string;
  realizedPnl: number;
  executedAt: string;
}

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  items: WatchlistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistItem {
  id: string;
  watchlistId: string;
  instrumentId: string;
  symbol: string;
  displayOrder: number;
}

export interface AccountPortfolioSummary {
  accountId: string;
  accountNumber: string;
  environment: EnvironmentMode;
  currency: string;
  balance: number;
  equity: number;
  usedMargin: number;
  freeMargin: number;
  marginLevelPercentage: number;
  unrealizedPnl: number;
  realizedPnl: number;
  dailyPnl: number;
  dailyReturnPercentage: number;
  openPositionsCount: number;
  openOrdersCount: number;
}

export type PaymentMethodType = 'STRIPE' | 'COINBASE' | 'BANK_WIRE' | 'CRYPTO';

export interface WalletTransaction {
  id: string;
  accountId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  method: PaymentMethodType | string;
  referenceId: string;
  details?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PlatformMarketingData {
  hero: {
    tagline: string;
    headline: string;
    subheadline: string;
    executionSpeedMs: number;
    activeMarketsCount: number;
    lowestSpreadPips: number;
    maxLeverage: string;
    protectionPolicy: string;
  };
  stats: Array<{
    label: string;
    value: string;
    highlight?: boolean;
  }>;
  advantages: Array<{
    id: string;
    title: string;
    description: string;
    badge?: string;
  }>;
  custodyMethods: Array<{
    id: string;
    title: string;
    subtitle: string;
    fee: string;
  }>;
}

export interface AccountTierSpec {
  id: string;
  name: string;
  badge?: string;
  featured?: boolean;
  description: string;
  spreadDisplay: string;
  spreadRawValue: number;
  spreadUnit: string;
  commission: string;
  minDeposit: number;
  maxLeverage: string;
  executionVenue: string;
  features: string[];
}

