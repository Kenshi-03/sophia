import { Queue } from 'bullmq';
import { getRedisClient } from '../redis';
import { logger } from '../logger';

const redisConnection = getRedisClient();

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000, // 1s, 2s, 4s, etc.
  },
  removeOnComplete: { age: 24 * 3600 }, // Keep for 24h for reporting/diagnostics
  removeOnFail: false, // Keep permanently failed jobs in 'failed' queue state to act as DLQ
};

// Global registry to prevent duplicate queue registration in Next.js development hot reload
const globalForQueues = global as unknown as {
  calendarSyncQueue?: Queue;
  cognitiveAnalysisQueue?: Queue;
  memoryQueue?: Queue;
};

export const calendarSyncQueue = globalForQueues.calendarSyncQueue || new Queue('calendarSync', {
  connection: redisConnection,
  defaultJobOptions,
});

export const cognitiveAnalysisQueue = globalForQueues.cognitiveAnalysisQueue || new Queue('cognitiveAnalysis', {
  connection: redisConnection,
  defaultJobOptions,
});

export const memoryQueue = globalForQueues.memoryQueue || new Queue('memory', {
  connection: redisConnection,
  defaultJobOptions,
});

if (process.env.NODE_ENV !== 'production') {
  globalForQueues.calendarSyncQueue = calendarSyncQueue;
  globalForQueues.cognitiveAnalysisQueue = cognitiveAnalysisQueue;
  globalForQueues.memoryQueue = memoryQueue;
}

logger.info('BullMQ Queues initialized', {
  queues: ['calendarSync', 'cognitiveAnalysis', 'memory'],
});
