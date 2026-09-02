import { createHmac } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createBridge } from '../src/bridge.js';
import {
  CLOSE_UNAUTHORIZED,
  SOCKET_OPEN,
  type ChannelSubscriber,
  type ClientSocket,
  type Logger,
  type SocketServer,
} from '../src/types.js';

const SECRET = 'shared-secret';
const CHANNEL = 'reservation-events';
const NOW = 1_000_000;

function token(expiresAt = NOW + 60, secret = SECRET): string {
  const exp = String(expiresAt);
  return `${exp}.${createHmac('sha256', secret).update(exp).digest('hex')}`;
}

type ConnectionListener = (socket: ClientSocket, request: { url?: string | undefined }) => void;
type MessageListener = (channel: string, message: string) => void;

class FakeServer implements SocketServer {
  private listener: ConnectionListener | undefined;

  on(_event: 'connection', listener: ConnectionListener): this {
    this.listener = listener;
    return this;
  }

  connect(socket: ClientSocket, url: string): void {
    this.listener?.(socket, { url });
  }
}

class FakeSubscriber implements ChannelSubscriber {
  private listener: MessageListener | undefined;

  on(_event: 'message', listener: MessageListener): this {
    this.listener = listener;
    return this;
  }

  publish(channel: string, message: string): void {
    this.listener?.(channel, message);
  }
}

function fakeSocket(): ClientSocket & { closeListeners: Array<() => void> } {
  const closeListeners: Array<() => void> = [];
  return {
    readyState: SOCKET_OPEN,
    send: vi.fn(),
    close: vi.fn(),
    on(_event: 'close', listener: () => void) {
      closeListeners.push(listener);
      return this;
    },
    closeListeners,
  };
}

const silentLogger: Logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

let server: FakeServer;
let subscriber: FakeSubscriber;

beforeEach(() => {
  vi.clearAllMocks();
  server = new FakeServer();
  subscriber = new FakeSubscriber();
  createBridge({ server, subscriber, channel: CHANNEL, secret: SECRET, logger: silentLogger, now: () => NOW });
});

describe('createBridge', () => {
  it('fans a channel message out to every authorized socket', () => {
    const a = fakeSocket();
    const b = fakeSocket();
    server.connect(a, `/?token=${token()}`);
    server.connect(b, `/?token=${token()}`);

    const payload = JSON.stringify({ id: '1', type: 'created', resource: 'reservations/1' });
    subscriber.publish(CHANNEL, payload);

    expect(a.send).toHaveBeenCalledTimes(1);
    expect(a.send).toHaveBeenCalledWith(payload);
    expect(b.send).toHaveBeenCalledTimes(1);
    expect(b.send).toHaveBeenCalledWith(payload);
  });

  it('rejects a bad token with close code 4001 and never delivers to it', () => {
    const socket = fakeSocket();
    server.connect(socket, `/?token=${token(NOW + 60, 'wrong-secret')}`);

    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(socket.close).toHaveBeenCalledWith(CLOSE_UNAUTHORIZED, 'invalid token');

    subscriber.publish(CHANNEL, 'payload');
    expect(socket.send).not.toHaveBeenCalled();
  });

  it('rejects a connection that omits the token', () => {
    const socket = fakeSocket();
    server.connect(socket, '/');

    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(socket.close).toHaveBeenCalledWith(CLOSE_UNAUTHORIZED, 'invalid token');
  });

  it('ignores messages published on a different channel', () => {
    const socket = fakeSocket();
    server.connect(socket, `/?token=${token()}`);

    subscriber.publish('other-channel', 'payload');

    expect(socket.send).not.toHaveBeenCalled();
  });

  it('stops delivering to a socket after it closes', () => {
    const socket = fakeSocket();
    server.connect(socket, `/?token=${token()}`);
    expect(socket.closeListeners).toHaveLength(1);

    socket.closeListeners[0]?.();
    subscriber.publish(CHANNEL, 'payload');

    expect(socket.send).not.toHaveBeenCalled();
  });

  it('skips sockets that are not in the OPEN state', () => {
    const socket = fakeSocket();
    server.connect(socket, `/?token=${token()}`);
    socket.readyState = SOCKET_OPEN + 1;

    subscriber.publish(CHANNEL, 'payload');

    expect(socket.send).not.toHaveBeenCalled();
  });
});
