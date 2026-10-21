// Market Data Real-Time WebSocket Gateway

import { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import {
  MarketDataProvider,
  WebSocketChannel,
  ClientSubscribeMessage,
  ServerWebSocketMessage,
} from '@nexus/core';

interface ClientState {
  ws: WebSocket;
  subscriptions: Set<WebSocketChannel>;
  isAlive: boolean;
}

export class MarketWebSocketGateway {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientState> = new Map();

  // Channel to active provider unsubscribe callbacks
  private providerUnsubscribes: Map<WebSocketChannel, () => void> = new Map();
  private channelSubscribers: Map<WebSocketChannel, Set<WebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout;

  constructor(server: HttpServer, private marketData: MarketDataProvider) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws/market',
    });

    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    // Heartbeat check every 30s
    this.heartbeatInterval = setInterval(() => {
      this.pingClients();
    }, 30000);
  }

  public close(): void {
    clearInterval(this.heartbeatInterval);
    for (const [ws] of this.clients.entries()) {
      try {
        ws.close(1001, 'Server shutting down');
      } catch (_e) {}
    }
    this.clients.clear();
    this.providerUnsubscribes.forEach((unsub) => {
      try {
        unsub();
      } catch (_e) {}
    });
    this.providerUnsubscribes.clear();
    this.channelSubscribers.clear();
    try {
      this.wss.close();
    } catch (_e) {}
  }

  private handleConnection(ws: WebSocket): void {
    const clientState: ClientState = {
      ws,
      subscriptions: new Set(),
      isAlive: true,
    };
    this.clients.set(ws, clientState);

    ws.on('pong', () => {
      clientState.isAlive = true;
    });

    ws.on('message', (raw: WebSocket.Data) => {
      this.handleClientMessage(ws, clientState, raw.toString());
    });

    ws.on('close', () => {
      this.handleDisconnection(ws, clientState);
    });

    ws.on('error', (_err) => {
      this.handleDisconnection(ws, clientState);
    });

    // Send connection greeting
    this.send(ws, {
      event: 'subscribed',
      channels: [],
    });
  }

  private handleClientMessage(ws: WebSocket, state: ClientState, raw: string): void {
    try {
      const msg: ClientSubscribeMessage = JSON.parse(raw);

      if (msg.action === 'ping') {
        this.send(ws, { event: 'pong', timestamp: Date.now() });
        return;
      }

      if (msg.action === 'subscribe' && msg.channels) {
        msg.channels.forEach((ch) => {
          state.subscriptions.add(ch);
          this.subscribeChannel(ch, ws);
        });

        this.send(ws, {
          event: 'subscribed',
          channels: Array.from(state.subscriptions),
        });
      }

      if (msg.action === 'unsubscribe' && msg.channels) {
        msg.channels.forEach((ch) => {
          state.subscriptions.delete(ch);
          this.unsubscribeChannel(ch, ws);
        });

        this.send(ws, {
          event: 'unsubscribed',
          channels: msg.channels,
        });
      }
    } catch (_err) {
      this.send(ws, {
        event: 'error',
        message: 'Invalid WebSocket message format. Expected JSON.',
      });
    }
  }

  private subscribeChannel(channel: WebSocketChannel, client: WebSocket): void {
    if (!this.channelSubscribers.has(channel)) {
      this.channelSubscribers.set(channel, new Set());
    }
    this.channelSubscribers.get(channel)!.add(client);

    // If this is the first client subscribing to this channel, attach to upstream provider
    if (!this.providerUnsubscribes.has(channel)) {
      const parts = channel.split(':');
      const type = parts[0];
      const symbol = parts[1];

      if (type === 'ticker' && symbol) {
        const unsub = this.marketData.subscribeTicker(symbol, (ticker) => {
          this.broadcast(channel, {
            event: 'ticker.update',
            data: ticker,
          });
        });
        this.providerUnsubscribes.set(channel, unsub);
      } else if (type === 'orderbook' && symbol) {
        const unsub = this.marketData.subscribeOrderBook(symbol, (book) => {
          this.broadcast(channel, {
            event: 'orderbook.update',
            data: book,
          });
        });
        this.providerUnsubscribes.set(channel, unsub);
      } else if (type === 'trades' && symbol) {
        const unsub = this.marketData.subscribeTrades(symbol, (trade) => {
          this.broadcast(channel, {
            event: 'trade.update',
            data: trade,
          });
        });
        this.providerUnsubscribes.set(channel, unsub);
      }
    }
  }

  private unsubscribeChannel(channel: WebSocketChannel, client: WebSocket): void {
    const subs = this.channelSubscribers.get(channel);
    if (subs) {
      subs.delete(client);
      // If no clients left, detach from upstream
      if (subs.size === 0) {
        this.channelSubscribers.delete(channel);
        const unsub = this.providerUnsubscribes.get(channel);
        if (unsub) {
          unsub();
          this.providerUnsubscribes.delete(channel);
        }
      }
    }
  }

  private handleDisconnection(ws: WebSocket, state: ClientState): void {
    state.subscriptions.forEach((ch) => {
      this.unsubscribeChannel(ch, ws);
    });
    this.clients.delete(ws);
  }

  private pingClients(): void {
    for (const [ws, state] of this.clients.entries()) {
      if (!state.isAlive) {
        ws.terminate();
        this.clients.delete(ws);
        continue;
      }
      state.isAlive = false;
      ws.ping();
    }
  }

  private send(ws: WebSocket, msg: ServerWebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  private broadcast(channel: WebSocketChannel, msg: ServerWebSocketMessage): void {
    const subs = this.channelSubscribers.get(channel);
    if (!subs) return;
    const payload = JSON.stringify(msg);
    subs.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }
}
