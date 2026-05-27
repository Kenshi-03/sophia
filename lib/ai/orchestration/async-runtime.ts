import { logger } from '../../logger';
import { 
  ExecutiveLifecycleState, 
  AsyncTaskState, 
  AsyncRuntimeTelemetry, 
  WorkingMemoryState 
} from '../working-memory/types';
import { WorkingMemory } from '../working-memory/store';

export interface AsyncTaskOptions<T = any> {
  taskId: string;
  taskType: string;
  parentRequestId: string;
  lifecycleState: ExecutiveLifecycleState;
  timeoutMs?: number;
  execute: (signal: AbortSignal) => Promise<T>;
  isCritical?: boolean; // If true, task failure aborts the parent Request context. Defaults to true.
}

export class AsyncTaskRunner<T = any> {
  public taskId: string;
  public taskType: string;
  public parentRequestId: string;
  public lifecycleState: ExecutiveLifecycleState;
  public createdAt: number;
  public startedAt: number | null = null;
  public completedAt: number | null = null;
  public timeoutMs: number;
  public executionState: AsyncTaskState = 'PENDING';
  public retryCount: number = 0;
  public isCritical: boolean;
  public taskTelemetry: {
    durationMs?: number;
    error?: string;
    details?: any;
  } = {};

  private executeFn: (signal: AbortSignal) => Promise<T>;

  constructor(options: AsyncTaskOptions<T>) {
    this.taskId = options.taskId;
    this.taskType = options.taskType;
    this.parentRequestId = options.parentRequestId;
    this.lifecycleState = options.lifecycleState;
    this.createdAt = Date.now();
    this.timeoutMs = options.timeoutMs || 10000; // default 10s
    this.executeFn = options.execute;
    this.isCritical = options.isCritical !== undefined ? options.isCritical : true;
  }

  public async run(signal: AbortSignal): Promise<T> {
    // 1. Explicit request-ownership validation
    if (!this.parentRequestId) {
      throw new Error(`Execution boundary violation: task ${this.taskId} has no parentRequestId.`);
    }

    if (signal.aborted) {
      this.executionState = 'CANCELLED';
      this.taskTelemetry.error = 'Task cancelled before execution started.';
      throw new Error(`Task ${this.taskId} aborted before execution started.`);
    }

    this.executionState = 'RUNNING';
    this.startedAt = Date.now();

    try {
      const result = await this.executeFn(signal);
      this.executionState = 'COMPLETED';
      this.completedAt = Date.now();
      this.taskTelemetry.durationMs = this.completedAt - this.startedAt;
      return result;
    } catch (err: any) {
      this.completedAt = Date.now();
      this.taskTelemetry.durationMs = this.completedAt - this.startedAt;
      this.taskTelemetry.error = err.message || String(err);

      if (signal.aborted) {
        this.executionState = 'CANCELLED';
      } else if (err.name === 'TimeoutError' || err.message?.toLowerCase().includes('timeout')) {
        this.executionState = 'TIMEOUT';
      } else {
        this.executionState = 'FAILED';
      }
      throw err;
    }
  }
}

export class CancellationManager {
  private static controllers = new Map<string, AbortController>();
  private static cancellationEvents: { requestId: string; reason: string; timestamp: string }[] = [];

  public static createScope(requestId: string): AbortSignal {
    if (!this.controllers.has(requestId)) {
      this.controllers.set(requestId, new AbortController());
    }
    return this.controllers.get(requestId)!.signal;
  }

  public static cancelScope(requestId: string, reason: string): void {
    const controller = this.controllers.get(requestId);
    if (controller) {
      controller.abort();
      this.cancellationEvents.push({
        requestId,
        reason,
        timestamp: new Date().toISOString()
      });
      logger.warn(`Request scope cancelled`, { requestId, reason });
    }
  }

  public static releaseScope(requestId: string): void {
    this.controllers.delete(requestId);
  }

  public static getCancellationEvents(requestId: string) {
    return this.cancellationEvents
      .filter(e => e.requestId === requestId)
      .map(e => ({ reason: e.reason, timestamp: e.timestamp }));
  }
}

export class TimeoutManager {
  private static timers = new Map<string, NodeJS.Timeout[]>();
  private static timeoutEvents: { requestId: string; durationMs: number; timestamp: string }[] = [];

  public static registerTimeout(
    requestId: string, 
    timeoutMs: number, 
    onTimeout: () => void
  ): void {
    const timer = setTimeout(() => {
      this.timeoutEvents.push({
        requestId,
        durationMs: timeoutMs,
        timestamp: new Date().toISOString()
      });
      logger.warn(`Execution timeout met`, { requestId, timeoutMs });
      onTimeout();
    }, timeoutMs);

    if (!this.timers.has(requestId)) {
      this.timers.set(requestId, []);
    }
    this.timers.get(requestId)!.push(timer);
  }

  public static clearScopeTimers(requestId: string): void {
    const list = this.timers.get(requestId);
    if (list) {
      list.forEach(clearTimeout);
      this.timers.delete(requestId);
    }
  }

  public static getTimeoutEvents(requestId: string) {
    return this.timeoutEvents
      .filter(e => e.requestId === requestId)
      .map(e => ({ durationMs: e.durationMs, timestamp: e.timestamp }));
  }
}

export class AsyncScheduler {
  private static maxConcurrentTasks = 3;
  private static maxTaskQueueDepth = 10;
  
  private static activeCount = 0;
  private static queue: { 
    task: AsyncTaskRunner; 
    resolve: (val: any) => void; 
    reject: (err: any) => void;
    signal: AbortSignal;
  }[] = [];

  /**
   * Deterministically schedules and queues tasks with strict backpressure and overflow limits.
   */
  public static async schedule<T = any>(task: AsyncTaskRunner<T>, signal: AbortSignal): Promise<T> {
    const schedulerStart = Date.now();

    // 1. Concurrency Budget Enforcement - Queue Overflow Rejection
    if (this.queue.length >= this.maxTaskQueueDepth) {
      logger.error('Async Scheduler backpressure: Queue depth exceeded', { 
        depth: this.queue.length, 
        max: this.maxTaskQueueDepth 
      });
      throw new Error(`Scheduler backpressure error: Maximum task queue depth limit (${this.maxTaskQueueDepth}) exceeded. Task ${task.taskId} rejected.`);
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject, signal });
      
      const latency = Date.now() - schedulerStart;
      task.taskTelemetry.details = { ...task.taskTelemetry.details, schedulerLatencyMs: latency };
      
      this.dispatch();
    });
  }

  /**
   * FIFO deterministic task dispatcher with concurrency control.
   */
  private static dispatch(): void {
    if (this.activeCount >= this.maxConcurrentTasks || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    const { task, resolve, reject, signal } = item;
    
    // Check if aborted while in queue
    if (signal.aborted) {
      task.executionState = 'CANCELLED';
      reject(new Error(`Task ${task.taskId} cancelled while waiting in queue.`));
      this.dispatch();
      return;
    }

    this.activeCount++;
    task.run(signal)
      .then((res) => {
        this.activeCount--;
        resolve(res);
        this.dispatch();
      })
      .catch((err) => {
        this.activeCount--;
        reject(err);
        this.dispatch();
      });
  }

  public static getQueueDepth(): number {
    return this.queue.length;
  }

  public static getActiveCount(): number {
    return this.activeCount;
  }
}

export class AsyncOrchestrator {
  private parentRequestId: string;
  private maxAsyncFanout = 5;
  private spawnedCount = 0;
  private tasksTracked: AsyncTaskRunner[] = [];

  constructor(parentRequestId: string) {
    this.parentRequestId = parentRequestId;
  }

  /**
   * Orchestrates a group of async tasks concurrently with fanout limits.
   */
  public async executeAllConcurrently<T = any>(
    tasks: AsyncTaskRunner<T>[]
  ): Promise<any[]> {
    // 1. Concurrency fanout creep boundary limit check
    if (this.spawnedCount + tasks.length > this.maxAsyncFanout) {
      throw new Error(`Concurrency Budget Error: spawning ${tasks.length} tasks would exceed request limit of ${this.maxAsyncFanout} spawned tasks.`);
    }

    this.spawnedCount += tasks.length;
    this.tasksTracked.push(...tasks);

    const signal = CancellationManager.createScope(this.parentRequestId);

    // Map each task execution block to handle failure isolation and degraded flow.
    const promises = tasks.map(async (task) => {
      // Cross-request leakage security validation
      if (task.parentRequestId !== this.parentRequestId) {
        throw new Error(`Security Violation: task parentRequestId ${task.parentRequestId} does not match originating request lifecycle ${this.parentRequestId}.`);
      }

      try {
        return await AsyncScheduler.schedule(task, signal);
      } catch (err) {
        logger.error(`Task ${task.taskId} failed execution`, { 
          taskId: task.taskId, 
          isCritical: task.isCritical, 
          error: err 
        });

        // If the task is non-critical, catch failure here so we degrade mode gracefully instead of failing the request
        if (!task.isCritical) {
          logger.warn(`Failure isolated: task ${task.taskId} is non-critical, returning null fallback`, { taskId: task.taskId });
          return null; 
        }

        // Critical tasks propagate errors to cancel the entire Request pool
        throw err;
      }
    });

    return Promise.all(promises);
  }

  /**
   * Compiles the FSM Async Telemetry trace block and releases request scope controllers.
   */
  public async compileTelemetryAndCleanup(wm: WorkingMemory): Promise<void> {
    const now = Date.now();
    const id = this.parentRequestId;

    // Collect counts
    let active = 0;
    let completed = 0;
    let failed = 0;
    let cancelled = 0;
    let timeouts = 0;
    const taskDurations: Record<string, number> = {};

    this.tasksTracked.forEach(t => {
      if (t.executionState === 'RUNNING' || t.executionState === 'PENDING') active++;
      else if (t.executionState === 'COMPLETED') completed++;
      else if (t.executionState === 'FAILED') failed++;
      else if (t.executionState === 'CANCELLED') cancelled++;
      else if (t.executionState === 'TIMEOUT') timeouts++;

      if (t.taskTelemetry.durationMs !== undefined) {
        taskDurations[t.taskId] = t.taskTelemetry.durationMs;
      }
    });

    const cancels = CancellationManager.getCancellationEvents(id);
    const timeoutEvents = TimeoutManager.getTimeoutEvents(id);

    // Bounded cleanup execution: releases signals and cleans timeouts to prevent memory leaks
    CancellationManager.releaseScope(id);
    TimeoutManager.clearScopeTimers(id);

    // Save telemetry logs inside state
    await wm.updateState((state) => {
      const schedulerLatency = this.tasksTracked.reduce(
        (acc, curr) => acc + (curr.taskTelemetry.details?.schedulerLatencyMs || 0), 
        0
      );

      state.asyncTelemetry = {
        activeTasks: active,
        completedTasks: completed,
        failedTasks: failed,
        cancelledTasks: cancelled,
        timeoutTasks: timeouts,
        queueDepth: AsyncScheduler.getQueueDepth(),
        concurrencyUsage: AsyncScheduler.getActiveCount(),
        taskDurations,
        cancellationEvents: cancels,
        timeoutEvents: timeoutEvents,
        schedulerLatency
      };
    });

    logger.info('Async Orchestrator telemetry compiled and scope resources cleaned', {
      requestId: id,
      completed,
      failed,
      cancelled,
      timeouts
    });
  }
}
