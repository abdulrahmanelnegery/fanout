import { verifyWsToken } from './token.js';
import {
  CLOSE_UNAUTHORIZED,
  SOCKET_OPEN,
  type ChannelSubscriber,
  type ClientSocket,
  type Logger,
  type SocketServer,
} from './types.js';

export interface BridgeOptions {
  server: SocketServer;
  subscriber: ChannelSubscriber;
  channel: string;
  secret: string;
  logger: Logger;
  now?: () => number;
}

export interface Bridge {
  /** Number of currently authorized sockets. Exposed for tests and health checks. */
  size(): number;
}

/**
 * Wires a Redis pub/sub channel to a set of authorized WebSocket clients:
 * every message on `channel` is forwarded verbatim to each open socket that
 * presented a valid token on connect.
 */
export function createBridge(options: BridgeOptions): Bridge {
  const { server, subscriber, channel, secret, logger } = options;
  const authorized = new Set<ClientSocket>();

  server.on('connection', (socket, request) => {
    const token = extractToken(request.url);

    if (token === null || !verifyWsToken(token, secret, options.now?.())) {
      logger.warn('ws.connection.rejected', { reason: 'invalid_token' });
      socket.close(CLOSE_UNAUTHORIZED, 'invalid token');
      return;
    }

    authorized.add(socket);
    logger.info('ws.connection.accepted', { authorized: authorized.size });

    socket.on('close', () => {
      authorized.delete(socket);
      logger.info('ws.connection.closed', { authorized: authorized.size });
    });
  });

  subscriber.on('message', (incoming, payload) => {
    if (incoming !== channel) {
      return;
    }

    let delivered = 0;
    for (const socket of authorized) {
      if (socket.readyState !== SOCKET_OPEN) {
        continue;
      }
      socket.send(payload);
      delivered += 1;
    }

    logger.info('ws.fanout', { channel: incoming, delivered });
  });

  return {
    size: () => authorized.size,
  };
}

function extractToken(url: string | undefined): string | null {
  if (url === undefined) {
    return null;
  }

  const separator = url.indexOf('?');
  if (separator === -1) {
    return null;
  }

  return new URLSearchParams(url.slice(separator + 1)).get('token');
}
