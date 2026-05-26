import { startWorkers } from '../lib/queue/worker';
import { logger } from '../lib/logger';

logger.info('Starting SOPHIA Background Worker Process...');

const manager = startWorkers();

// Graceful Shutdown
const handleShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down worker process gracefully...`);
  try {
    await manager.close();
    logger.info('Worker process terminated cleanly.');
    process.exit(0);
  } catch (err) {
    logger.error('Error during worker process shutdown', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception in worker process', err);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection in worker process', new Error(String(reason)));
});
