import { Queue } from 'bullmq';
import { getRedisTCPConnection } from '../redis';
import { logger } from '../logger';

const isMock = process.env.MOCK_REDIS === 'true' || (globalThis as any).MOCK_REDIS === true;

class MockQueue {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  async add(jobName: string, data: any) {
    logger.info(`[MockQueue: ${this.name}] Mocked adding job: ${jobName}`, { data });
    return { id: `mock-job-${Math.random().toString(36).substring(2, 11)}` };
  }
  async getJobCounts() {
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 };
  }
  async getFailed() {
    return [];
  }
  async close() {}
}

const redisConnection = isMock ? null : getRedisTCPConnection();

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
  calendarSyncQueue?: any;
  cognitiveAnalysisQueue?: any;
  memoryQueue?: any;
};

export const calendarSyncQueue = globalForQueues.calendarSyncQueue || 
  (isMock ? new MockQueue('calendarSync') : new Queue('calendarSync', {
    connection: redisConnection,
    defaultJobOptions,
  }));

export const cognitiveAnalysisQueue = globalForQueues.cognitiveAnalysisQueue || 
  (isMock ? new MockQueue('cognitiveAnalysis') : new Queue('cognitiveAnalysis', {
    connection: redisConnection,
    defaultJobOptions,
  }));

export const memoryQueue = globalForQueues.memoryQueue || 
  (isMock ? new MockQueue('memory') : new Queue('memory', {
    connection: redisConnection,
    defaultJobOptions,
  }));

if (process.env.NODE_ENV !== 'production') {
  globalForQueues.calendarSyncQueue = calendarSyncQueue;
  globalForQueues.cognitiveAnalysisQueue = cognitiveAnalysisQueue;
  globalForQueues.memoryQueue = memoryQueue;
}

logger.info(`BullMQ Queues initialized (${isMock ? 'Mocked' : 'Real'})`, {
  queues: ['calendarSync', 'cognitiveAnalysis', 'memory'],
});
