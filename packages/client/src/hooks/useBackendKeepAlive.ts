import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config';

export type BackendStatus = 'CHECKING' | 'WAKING_UP' | 'ONLINE' | 'OFFLINE';

export interface UseBackendKeepAliveOptions {
  /** Interval in milliseconds between keep-alive pings (default: 10,000ms / 10s) */
  pingIntervalMs?: number;
  /** Estimated Render free tier cold-start duration in seconds (default: 50s) */
  expectedWakeupSeconds?: number;
  /** Callback fired immediately when server becomes ONLINE */
  onServerReady?: () => void;
}

export interface BackendKeepAliveState {
  status: BackendStatus;
  latency: number | null;
  countdown: number;
  retryCount: number;
  isWakingUp: boolean;
  lastSuccessfulPing: Date | null;
  manualPing: () => Promise<boolean>;
  resetWarmup: () => void;
}

export function useBackendKeepAlive(options: UseBackendKeepAliveOptions = {}): BackendKeepAliveState {
  const {
    pingIntervalMs = 10000, // 10 seconds as requested
    expectedWakeupSeconds = 50, // ~50s for Render free tier cold start
    onServerReady,
  } = options;

  const [status, setStatus] = useState<BackendStatus>('CHECKING');
  const [latency, setLatency] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(expectedWakeupSeconds);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [lastSuccessfulPing, setLastSuccessfulPing] = useState<Date | null>(null);

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isOnlineRef = useRef<boolean>(false);
  const retryCountRef = useRef<number>(0);

  // Ping backend health/ping probe
  const probeBackend = useCallback(async (): Promise<boolean> => {
    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7500); // 7.5s probe timeout

      const response = await fetch(`${API_BASE_URL}/api/ping`, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache', Accept: 'application/json' },
        signal: controller.signal,
      }).catch(async () => {
        // Fallback to /api/health if /api/ping is not yet available
        return await fetch(`${API_BASE_URL}/api/health`, {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache', Accept: 'application/json' },
          signal: controller.signal,
        });
      });

      clearTimeout(timeoutId);

      if (response && response.ok) {
        const measuredLatency = Math.round(performance.now() - startTime);
        setLatency(measuredLatency);
        setLastSuccessfulPing(new Date());

        const wasNotOnline = !isOnlineRef.current;
        isOnlineRef.current = true;
        setStatus('ONLINE');

        if (wasNotOnline && onServerReady) {
          onServerReady();
        }

        return true;
      } else {
        throw new Error(`HTTP ${response?.status || 'Unknown'}`);
      }
    } catch (_err) {
      // Backend is down or waking up from sleep
      retryCountRef.current += 1;
      setRetryCount(retryCountRef.current);
      isOnlineRef.current = false;
      setStatus((prev) => (prev === 'ONLINE' ? 'OFFLINE' : 'WAKING_UP'));
      return false;
    }
  }, [onServerReady]);

  // Manual Trigger
  const manualPing = useCallback(async () => {
    return await probeBackend();
  }, [probeBackend]);

  // Reset warmup countdown
  const resetWarmup = useCallback(() => {
    setCountdown(expectedWakeupSeconds);
    retryCountRef.current = 0;
    setRetryCount(0);
    probeBackend();
  }, [expectedWakeupSeconds, probeBackend]);

  // Initial check & recurring 10s ping interval
  useEffect(() => {
    // Run immediate check
    probeBackend();

    // Recurring ping every 10 seconds to keep backend active all the time
    pingIntervalRef.current = setInterval(() => {
      probeBackend();
    }, pingIntervalMs);

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [probeBackend, pingIntervalMs]);

  // Countdown clock when in WAKING_UP state
  useEffect(() => {
    if (status === 'WAKING_UP') {
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => (prev > 1 ? prev - 1 : 1));
      }, 1000);
    } else if (status === 'ONLINE') {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setCountdown(expectedWakeupSeconds);
    }

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [status, expectedWakeupSeconds]);

  return {
    status,
    latency,
    countdown,
    retryCount,
    isWakingUp: status === 'WAKING_UP',
    lastSuccessfulPing,
    manualPing,
    resetWarmup,
  };
}
