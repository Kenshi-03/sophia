import { Worker, Job } from 'bullmq';
import { getRedisClient, makeCacheKey } from '../redis';
import { logger } from '../logger';
import { syncUserCalendar } from '../google/calendar/sync';
import { generateCognitiveBriefing } from '../ai/cognitive/briefing-generator';
import { cacheManager } from '../cache/cache-manager';

const redisConnection = getRedisClient();

export function startWorkers() {
  logger.info('Starting BullMQ Workers...');

  // 1. Calendar Sync Worker
  const calendarSyncWorker = new Worker(
    'calendarSync',
    async (job: Job) => {
      const { userId } = job.data;
      if (!userId) throw new Error('Missing userId in calendarSync job data');
      
      logger.info('Processing calendarSync job', { jobId: job.id, userId });
      const result = await syncUserCalendar(userId);
      logger.info('CalendarSync job completed successfully', { jobId: job.id, userId });
      return result;
    },
    { connection: redisConnection }
  );

  // 2. Cognitive Analysis Worker
  const cognitiveAnalysisWorker = new Worker(
    'cognitiveAnalysis',
    async (job: Job) => {
      const { userId } = job.data;
      if (!userId) throw new Error('Missing userId in cognitiveAnalysis job data');

      logger.info('Processing cognitiveAnalysis job', { jobId: job.id, userId });
      const briefing = await generateCognitiveBriefing(userId);
      
      // Cache the fresh briefing
      const cacheKey = makeCacheKey(userId, 'cognitive', 'briefing');
      await cacheManager.set(cacheKey, briefing, 3600); // 1 hour TTL
      
      logger.info('CognitiveAnalysis job completed and cached successfully', { jobId: job.id, userId });
      return { success: true };
    },
    { connection: redisConnection }
  );

  // 3. Memory Worker
  const memoryWorker = new Worker(
    'memory',
    async (job: Job) => {
      const { userId, memoryId, action } = job.data;
      logger.info('Processing memory background job', { jobId: job.id, userId, memoryId, action });
      // Placeholder: ready to extend for heavy operations like memory embedding or categorization
      return { success: true };
    },
    { connection: redisConnection }
  );

  // Error/DLQ Handling Setup
  const workers = [calendarSyncWorker, cognitiveAnalysisWorker, memoryWorker];

  workers.forEach((worker) => {
    worker.on('failed', (job, err) => {
      logger.error(`Job failed in queue [${worker.name}]`, err, {
        jobId: job?.id,
        data: job?.data,
        attemptsMade: job?.attemptsMade,
      });
      // The job is not auto-removed because we configured `removeOnFail: false`.
      // This preserves permanently failed jobs in the Redis failure state acting as the Dead-letter queue.
    });

    worker.on('error', (err) => {
      logger.error(`Worker error in [${worker.name}]`, err);
    });

    worker.on('completed', (job) => {
      logger.info(`Job completed in queue [${worker.name}]`, { jobId: job.id });
    });
  });

  return {
    calendarSyncWorker,
    cognitiveAnalysisWorker,
    memoryWorker,
    close: async () => {
      logger.info('Closing all workers...');
      await Promise.all(workers.map(w => w.close()));
    }
  };
}
