import { Queue } from 'bullmq';
import { getRedisTCPConnection } from '../redis';
import { logger } from '../logger';

const isMock = process.env.MOCK_REDIS === 'true' || (globalThis as any).MOCK_REDIS === true;

class MockQueue {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  async add(jobName: string, data: any, options?: any) {
    logger.info(`[MockQueue: ${this.name}] Mocked adding job: ${jobName}`, { data, options });
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

function createLazyQueue(name: string, globalKey: 'calendarSyncQueue' | 'cognitiveAnalysisQueue' | 'memoryQueue') {
  let instance: any = null;
  const init = () => {
    if (!instance) {
      instance = globalForQueues[globalKey] || 
        (isMock ? new MockQueue(name) : new Queue(name, {
          connection: getRedisTCPConnection(),
          defaultJobOptions,
        }));
      if (process.env.NODE_ENV !== 'production') {
        globalForQueues[globalKey] = instance;
      }
    }
    return instance;
  };

  return new Proxy({} as any, {
    get(target, prop, receiver) {
      const queue = init();
      const value = Reflect.get(queue, prop, receiver);
      if (typeof value === 'function') {
        return value.bind(queue);
      }
      return value;
    }
  });
}

export const calendarSyncQueue = createLazyQueue('calendarSync', 'calendarSyncQueue');
export const cognitiveAnalysisQueue = createLazyQueue('cognitiveAnalysis', 'cognitiveAnalysisQueue');
export const memoryQueue = createLazyQueue('memory', 'memoryQueue');

logger.info(`BullMQ Queues initialized (${isMock ? 'Mocked' : 'Real'})`, {
  queues: ['calendarSync', 'cognitiveAnalysis', 'memory'],
});
