// Prisma PostgreSQL / Neon Database Gateway
import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient | null = null;
let isConnected = false;

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return prismaInstance;
}

export async function initDatabaseConnection(): Promise<boolean> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.includes('localhost:5432/nexus_trading')) {
    console.log('[DATABASE] No remote PostgreSQL/Neon URL configured. Running in high-performance local mode.');
    return false;
  }

  try {
    const client = getPrismaClient();
    await client.$connect();
    isConnected = true;
    console.log('[DATABASE] ✅ Successfully connected to PostgreSQL / Neon Cloud Database!');
    return true;
  } catch (err: any) {
    console.warn('[DATABASE] ⚠️ PostgreSQL connection failed:', err.message);
    isConnected = false;
    return false;
  }
}

export function isDbConnected(): boolean {
  return isConnected;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (prismaInstance) {
    try {
      await prismaInstance.$disconnect();
    } catch (err: any) {
      console.warn('[DATABASE] Disconnect error:', err.message);
    } finally {
      isConnected = false;
      prismaInstance = null;
    }
  }
}
