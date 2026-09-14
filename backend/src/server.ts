import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, supabase: new URL(env.SUPABASE_URL).host },
    `East-Market API listening on http://localhost:${env.PORT}`,
  );
});

/**
 * Stop accepting new connections, let in-flight requests finish, then exit.
 * Without this, a deploy drops every request that happens to be mid-flight.
 * The 10s ceiling stops a stuck socket holding the process open forever.
 */
function shutdown(signal: string): void {
  logger.info({ signal }, 'Shutting down');

  const forced = setTimeout(() => {
    logger.error('Graceful shutdown timed out; forcing exit');
    process.exit(1);
  }, 10_000);
  forced.unref();

  server.close((error) => {
    if (error) {
      logger.error({ err: error }, 'Error while closing the server');
      process.exit(1);
    }
    logger.info('Closed cleanly');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  // The process is in an unknown state after this; log and let the supervisor
  // restart it rather than continuing to serve from a corrupted one.
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});
