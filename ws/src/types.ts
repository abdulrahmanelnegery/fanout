export type LogLevel = 'info' | 'warn' | 'error';

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * The slice of `ws`'s WebSocket that the fan-out actually depends on. Declaring
 * it explicitly keeps the bridge unit testable with plain fakes.
 */
export interface ClientSocket {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  on(event: 'close', listener: () => void): this;
}

export interface SocketServer {
  on(
    event: 'connection',
    listener: (socket: ClientSocket, request: { url?: string | undefined }) => void,
  ): this;
}

export interface ChannelSubscriber {
  on(event: 'message', listener: (channel: string, message: string) => void): this;
}

/** WebSocket.OPEN, inlined so the bridge does not need the `ws` runtime. */
export const SOCKET_OPEN = 1;

/** Close code sent to clients that present a missing or invalid token. */
export const CLOSE_UNAUTHORIZED = 4001;
