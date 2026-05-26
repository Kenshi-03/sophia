import { startWorkers } from '../lib/queue/worker';
import { logger } from '../lib/logger';
import { cleanupStaleExecutions } from '../lib/ai/working-memory/cleanup';

logger.info('Starting SOPHIA Background Worker Process...');

const manager = startWorkers();

// Run periodic stale Working Memory recovery worker every 5 minutes
const cleanupInterval = setInterval(async () => {
  try {
    logger.debug('Periodic Worker Action: scanning for stale working memory logs...');
    const count = await cleanupStaleExecutions();
    if (count > 0) {
      logger.info(`Periodic Worker Action: recovered and cleaned ${count} stale working memory executions.`);
    }
  } catch (err) {
    logger.error('Failed running background stale execution recovery', err);
  }
}, 5 * 60 * 1000);

// Graceful Shutdown
const handleShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down worker process gracefully...`);
  clearInterval(cleanupInterval);
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
