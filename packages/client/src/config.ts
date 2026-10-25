// Unified Production Configuration for API and WebSocket Endpoints

/**
 * Resolves the backend HTTP/REST base URL.
 * Checks for Vite environment variable VITE_API_URL first.
 * If running on a deployed domain (non-localhost), falls back to window.location.
 * Defaults to http://localhost:4000 for local development.
 */
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string) ||
  (typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1' &&
  window.location.port !== '5173'
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://localhost:4000');

/**
 * Resolves the backend WebSocket market streaming gateway URL.
 * Checks for Vite environment variable VITE_WS_URL first.
 * If VITE_API_URL is provided, auto-derives the WebSocket URL.
 * If running on a deployed domain, switches ws:// or wss:// based on current protocol.
 * Defaults to ws://localhost:4000/ws/market for local development.
 */
export const WS_BASE_URL: string =
  (import.meta.env.VITE_WS_URL as string) ||
  (import.meta.env.VITE_API_URL
    ? `${(import.meta.env.VITE_API_URL as string).replace(/^http/, 'ws')}/ws/market`
    : typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1' &&
      window.location.port !== '5173'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/market`
    : 'ws://localhost:4000/ws/market');
