/**
 * Production Keep-Alive & Self-Ping Service for Render Free Tier
 *
 * Render spins down free-tier web services after 15 minutes of zero HTTP traffic.
 * This service automatically executes periodic HTTP pings to the public URL
 * (provided by Render as RENDER_EXTERNAL_URL) every 10-14 minutes, keeping
 * the instance active and preventing sleep / cold starts.
 */

export interface KeepAliveConfig {
  targetUrl?: string;
  intervalMinutes?: number;
  enabled?: boolean;
}

let keepAliveTimer: NodeJS.Timeout | null = null;

export function startKeepAliveService(config: KeepAliveConfig = {}): { stop: () => void } {
  // If explicitly disabled, exit
  if (config.enabled === false || process.env.KEEP_ALIVE_ENABLED === 'false') {
    console.log('[RENDER KEEP-ALIVE] Service disabled via configuration.');
    return { stop: () => {} };
  }

  // Detect external URL from Render or custom configuration
  const rawUrl =
    config.targetUrl ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.KEEP_ALIVE_URL ||
    process.env.API_BASE_URL;

  if (!rawUrl) {
    console.log(
      '[RENDER KEEP-ALIVE] Notice: No RENDER_EXTERNAL_URL or KEEP_ALIVE_URL detected. ' +
        'Server self-ping is idle. In Render, RENDER_EXTERNAL_URL is automatically provided.'
    );
    return { stop: () => {} };
  }

  const cleanUrl = rawUrl.replace(/\/+$/, '');
  const pingUrl = `${cleanUrl}/api/ping`;
  const intervalMinutes = config.intervalMinutes || parseInt(process.env.KEEP_ALIVE_INTERVAL_MINUTES || '10', 10);
  const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;

  console.log(`[RENDER KEEP-ALIVE] Active: Pinging ${pingUrl} every ${intervalMinutes} minutes.`);

  // Function to execute the ping
  const executePing = async () => {
    const startTime = Date.now();
    try {
      const response = await fetch(pingUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Nexus-KeepAlive-Worker/1.0',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000), // 15-second timeout
      });

      const elapsed = Date.now() - startTime;
      if (response.ok) {
        console.log(`[RENDER KEEP-ALIVE] Heartbeat success: ${response.status} OK (${elapsed}ms)`);
      } else {
        console.warn(`[RENDER KEEP-ALIVE] Heartbeat returned unexpected status: ${response.status} (${elapsed}ms)`);
      }
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      console.warn(`[RENDER KEEP-ALIVE] Heartbeat ping error (${elapsed}ms): ${err.message}`);
    }
  };

  // Schedule recurring ping
  keepAliveTimer = setInterval(executePing, intervalMs);

  // Unref timer so it doesn't prevent Node process from shutting down cleanly
  if (keepAliveTimer.unref) {
    keepAliveTimer.unref();
  }

  return {
    stop: () => {
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
        console.log('[RENDER KEEP-ALIVE] Service stopped.');
      }
    },
  };
}

export function stopKeepAliveService(): void {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}
