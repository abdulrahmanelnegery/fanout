export interface Config {
  port: number;
  redisUrl: string;
  channel: string;
  secret: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const secret = env.WS_TOKEN_SECRET ?? '';
  if (secret === '') {
    throw new Error('WS_TOKEN_SECRET is required and must match the Laravel API.');
  }

  const port = Number(env.WS_PORT ?? '8080');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`WS_PORT must be a valid TCP port, got "${env.WS_PORT ?? ''}".`);
  }

  return {
    port,
    redisUrl: env.REDIS_URL ?? 'redis://127.0.0.1:6379',
    channel: env.REDIS_CHANNEL ?? 'reservation-events',
    secret,
  };
}
