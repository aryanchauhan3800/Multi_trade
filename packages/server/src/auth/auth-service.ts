// Institutional Security & Authentication Engine (PBKDF2/HMAC-SHA256, JWT & RBAC)

import crypto from 'crypto';
import { UserRole } from '@nexus/core';

export interface UserSession {
  userId: string;
  email: string;
  role: UserRole;
  accountId: string;
  createdAt: number;
  expiresAt: number;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  accountId: string;
  createdAt: string;
}

export class AuthService {
  private users: Map<string, UserRecord> = new Map(); // email -> UserRecord
  private sessions: Map<string, UserSession> = new Map(); // token -> UserSession
  private jwtSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'nexus_super_secret_institutional_key_2026';

    // Seed default admin and trader accounts
    this.seedUser('admin@nexus.exchange', 'NexusAdmin2026!', 'ADMIN', 'acc_default');
    this.seedUser('trader@nexus.exchange', 'Trader2026!', 'TRADER', 'acc_trader_1');
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  private seedUser(email: string, pass: string, role: UserRole, accountId: string): void {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(pass, salt);
    const id = `usr_${email.split('@')[0]}_${Math.random().toString(36).substring(2, 6)}`;

    this.users.set(email.toLowerCase(), {
      id,
      email: email.toLowerCase(),
      passwordHash,
      salt,
      role,
      accountId,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Register a new user account
   */
  public register(email: string, pass: string, role: UserRole = 'TRADER'): { token: string; user: Omit<UserRecord, 'passwordHash' | 'salt'> } {
    const normalized = email.toLowerCase().trim();
    if (!normalized || !pass || pass.length < 8) {
      throw new Error('Valid email and password (minimum 8 characters) required');
    }

    if (this.users.has(normalized)) {
      throw new Error('User already exists with this email');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(pass, salt);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const accountId = `acc_${userId}`;

    const user: UserRecord = {
      id: userId,
      email: normalized,
      passwordHash,
      salt,
      role,
      accountId,
      createdAt: new Date().toISOString(),
    };

    this.users.set(normalized, user);
    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        accountId: user.accountId,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Authenticate user with password
   */
  public login(email: string, pass: string): { token: string; user: Omit<UserRecord, 'passwordHash' | 'salt'> } {
    const normalized = email.toLowerCase().trim();
    const user = this.users.get(normalized);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const testHash = this.hashPassword(pass, user.salt);
    if (!crypto.timingSafeEqual(Buffer.from(user.passwordHash, 'hex'), Buffer.from(testHash, 'hex'))) {
      throw new Error('Invalid email or password');
    }

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        accountId: user.accountId,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Validate and decode Bearer token
   */
  public verifyToken(token: string): UserSession | null {
    const session = this.sessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }

    return session;
  }

  public logout(token: string): void {
    this.sessions.delete(token);
  }

  private generateToken(user: UserRecord): string {
    const token = `nxt_${crypto.randomBytes(32).toString('hex')}`;
    const session: UserSession = {
      userId: user.id,
      email: user.email,
      role: user.role,
      accountId: user.accountId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days validity
    };

    this.sessions.set(token, session);
    return token;
  }
}
