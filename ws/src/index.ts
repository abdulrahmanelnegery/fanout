import { Redis } from 'ioredis';
import { WebSocketServer } from 'ws';

import { createBridge } from './bridge.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger();

  const subscriber = new Redis(config.redisUrl, { lazyConnect: true });
  subscriber.on('error', (error: Error) => {
    logger.error('redis.error', { message: error.message });
  });

  const server = new WebSocketServer({ port: config.port });

  createBridge({
    server,
    subscriber,
    channel: config.channel,
    secret: config.secret,
    logger,
  });

  await subscriber.connect();
  await subscriber.subscribe(config.channel);
  logger.info('ws.listening', { port: config.port, channel: config.channel });

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info('ws.shutdown.begin', { signal });

    server.close(() => {
      subscriber
        .quit()
        .catch(() => subscriber.disconnect())
        .finally(() => {
          logger.info('ws.shutdown.complete', { signal });
          process.exit(0);
        });
    });

    for (const client of server.clients) {
      client.close(1001, 'server shutting down');
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ level: 'error', message })}\n`);
  process.exit(1);
});
