// Institutional Security & Authentication Engine (PBKDF2/HMAC-SHA256, JWT & RBAC)
// With Persistent File-Backed Store to preserve accounts across server restarts

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { UserRole } from '@nexus/core';
import { getPrismaClient, isDbConnected } from '../db/prisma.js';

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
  private dataFilePath: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'nexus_super_secret_institutional_key_2026';

    const possibleDir = path.resolve(process.cwd(), 'packages/server/data');
    if (!fs.existsSync(possibleDir)) {
      try {
        fs.mkdirSync(possibleDir, { recursive: true });
      } catch (_e) {}
    }
    this.dataFilePath = path.join(possibleDir, 'users.json');

    // 1. Restore persisted users & sessions from disk if available
    this.loadFromDisk();

    // 2. Always ensure default seeded admin and trader accounts exist
    this.seedUser('admin@nexus.exchange', 'NexusAdmin2026!', 'ADMIN', 'acc_default');
    this.seedUser('trader@nexus.exchange', 'Trader2026!', 'TRADER', 'acc_trader_1');
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.users && Array.isArray(parsed.users)) {
          for (const u of parsed.users) {
            if (u && u.email) {
              this.users.set(u.email.toLowerCase(), u);
            }
          }
        }
        if (parsed.sessions && Array.isArray(parsed.sessions)) {
          const now = Date.now();
          for (const s of parsed.sessions) {
            if (s && s.token && s.expiresAt > now) {
              this.sessions.set(s.token, s);
            }
          }
        }
      }
    } catch (_err) {}
  }

  private saveToDisk(): void {
    try {
      const payload = {
        users: Array.from(this.users.values()),
        sessions: Array.from(this.sessions.entries()).map(([token, session]) => ({
          token,
          ...session,
        })),
      };
      fs.writeFileSync(this.dataFilePath, JSON.stringify(payload, null, 2), 'utf8');
    } catch (_err) {}
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  private seedUser(email: string, pass: string, role: UserRole, accountId: string): void {
    const normalized = email.toLowerCase();
    if (this.users.has(normalized)) return;

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(pass, salt);
    const id = `usr_${email.split('@')[0]}_${Math.random().toString(36).substring(2, 6)}`;

    this.users.set(normalized, {
      id,
      email: normalized,
      passwordHash,
      salt,
      role,
      accountId,
      createdAt: new Date().toISOString(),
    });
    this.saveToDisk();
  }

  public async syncWithDatabase(): Promise<void> {
    if (!isDbConnected()) return;
    try {
      const client = getPrismaClient();
      const dbUsers = await client.user.findMany({ include: { accounts: true } });
      for (const u of dbUsers) {
        const [pHash, s] = u.passwordHash.includes(':') ? u.passwordHash.split(':') : [u.passwordHash, ''];
        const accId = u.accounts[0]?.accountNumber || `acc_${u.id}`;
        this.users.set(u.email.toLowerCase(), {
          id: u.id,
          email: u.email.toLowerCase(),
          passwordHash: pHash,
          salt: s,
          role: u.role as UserRole,
          accountId: accId,
          createdAt: u.createdAt.toISOString(),
        });
      }
      this.saveToDisk();
      if (dbUsers.length > 0) {
        console.log(`[DATABASE] Synced ${dbUsers.length} user accounts from Neon PostgreSQL!`);
      }
    } catch (err: any) {
      console.warn('[DATABASE] Failed to sync users from DB:', err.message);
    }
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
    this.saveToDisk();

    // If PostgreSQL / Neon is connected, write to DB immediately!
    if (isDbConnected()) {
      const client = getPrismaClient();
      client.user
        .create({
          data: {
            id: userId,
            email: normalized,
            passwordHash: `${passwordHash}:${salt}`,
            role: role as any,
            accounts: {
              create: {
                accountNumber: accountId,
                currency: 'USD',
                environment: 'PAPER_TRADING',
              },
            },
          },
        })
        .catch((e) => console.warn('[DATABASE] Async user sync error:', e.message));
    }

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
   * Dynamically generate a fresh, non-static demo/guest session on the fly
   */
  public generateDynamicDemoSession(role: UserRole = 'TRADER', customEmail?: string): {
    token: string;
    user: Omit<UserRecord, 'passwordHash' | 'salt'>;
  } {
    const randomSuffix = crypto.randomBytes(3).toString('hex');
    const email = customEmail || `${role.toLowerCase()}_${randomSuffix}@nexus.exchange`;
    const autoPass = `Nexus_${crypto.randomBytes(8).toString('hex')}!`;
    return this.register(email, autoPass, role);
  }

  /**
   * Authenticate user with password
   */
  public login(email: string, pass: string): { token: string; user: Omit<UserRecord, 'passwordHash' | 'salt'> } {
    const normalized = email.toLowerCase().trim();
    const user = this.users.get(normalized);

    if (!user) {
      throw new Error(`Account not found for "${normalized}". Please click the "Open Account" tab to register.`);
    }

    const testHash = this.hashPassword(pass, user.salt);
    if (!crypto.timingSafeEqual(Buffer.from(user.passwordHash, 'hex'), Buffer.from(testHash, 'hex'))) {
      throw new Error('Invalid email or password');
    }

    const token = this.generateToken(user);
    this.saveToDisk();

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
      this.saveToDisk();
      return null;
    }

    return session;
  }

  public logout(token: string): void {
    this.sessions.delete(token);
    this.saveToDisk();
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
