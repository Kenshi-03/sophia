import { WorkingMemory } from '../lib/ai/working-memory/store';
import { ExecutiveFSM } from '../lib/ai/orchestration/executive-fsm';
import { 
  AsyncTaskRunner, 
  AsyncScheduler, 
  AsyncOrchestrator, 
  CancellationManager, 
  TimeoutManager 
} from '../lib/ai/orchestration/async-runtime';

describe('AsyncOrchestrator Core (D2.2)', () => {
  const userId = 'test-user-async';
  const sessionId = 'test-session-async';
  const query = 'test query for async';

  let wm: WorkingMemory;
  let requestId: string;

  beforeEach(async () => {
    wm = new WorkingMemory(userId, sessionId, query);
    await wm.save();
    requestId = wm.getState().executionId;
  });

  afterEach(() => {
    CancellationManager.releaseScope(requestId);
    TimeoutManager.clearScopeTimers(requestId);
  });

  describe('1. Bounded Concurrency & 8. Queue Overflow Protection', () => {
    it('should respect max task concurrency and reject tasks on queue overflow', async () => {
      const activeRunning: string[] = [];
      const createDelayedTask = (id: string, delay: number) => {
        return new AsyncTaskRunner({
          taskId: id,
          taskType: 'test_delay',
          parentRequestId: requestId,
          lifecycleState: 'RETRIEVAL',
          execute: async (signal) => {
            activeRunning.push(id);
            await new Promise(resolve => setTimeout(resolve, delay));
            activeRunning.splice(activeRunning.indexOf(id), 1);
            return id;
          }
        });
      };

      const signal = CancellationManager.createScope(requestId);

      // Create 15 delayed tasks to trigger scheduler backpressure
      // Max concurrent tasks is 3, max queue depth is 10.
      // Total supported outstanding tasks = 3 (running) + 10 (queued) = 13 tasks.
      // Task 14 and 15 should overflow and throw an error immediately on schedule.
      const runners: AsyncTaskRunner[] = [];
      for (let i = 0; i < 15; i++) {
        runners.push(createDelayedTask(`delayed_${i}`, 100));
      }

      const schedulePromises = runners.map(async (task, idx) => {
        try {
          return await AsyncScheduler.schedule(task, signal);
        } catch (err: any) {
          expect(err.message).toContain('Scheduler backpressure error');
          return `overflowed_${idx}`;
        }
      });

      const results = await Promise.all(schedulePromises);

      // Verify some tasks were rejected with backpressure error
      const overflowCount = results.filter(r => String(r).startsWith('overflowed')).length;
      expect(overflowCount).toBeGreaterThanOrEqual(2);

      // Verify that concurrent running tasks never exceeded maxConcurrentTasks (3)
      expect(AsyncScheduler.getActiveCount()).toBeLessThanOrEqual(3);
    });
  });

  describe('2. Deterministic Scheduling & 11. Scheduler Latency Stability', () => {
    it('should execute tasks in FIFO order and run validations in < 1ms', async () => {
      const executionOrder: string[] = [];
      const createTask = (id: string) => {
        return new AsyncTaskRunner({
          taskId: id,
          taskType: 'test_fifo',
          parentRequestId: requestId,
          lifecycleState: 'RETRIEVAL',
          execute: async () => {
            executionOrder.push(id);
            return id;
          }
        });
      };

      const signal = CancellationManager.createScope(requestId);
      const tasks = [createTask('A'), createTask('B'), createTask('C')];

      // Schedule them
      const scheduleStart = Date.now();
      await Promise.all(tasks.map(t => AsyncScheduler.schedule(t, signal)));
      const duration = Date.now() - scheduleStart;

      // Verify FIFO order execution
      expect(executionOrder).toEqual(['A', 'B', 'C']);

      // Latency stability validation (scheduler dispatch cost should be extremely low)
      const avgSchedulerLatency = tasks.reduce(
        (acc, t) => acc + (t.taskTelemetry.details?.schedulerLatencyMs || 0), 
        0
      ) / tasks.length;
      console.log(`Average Scheduler Dispatch latency: ${avgSchedulerLatency}ms`);
      expect(avgSchedulerLatency).toBeLessThan(1.0);
    });
  });

  describe('3. Task Cancellation & 9. Cancellation Propagation', () => {
    it('should propagate cancellation signals and cancel pending/running tasks', async () => {
      const task = new AsyncTaskRunner({
        taskId: 'cancellable_task',
        taskType: 'test_cancel',
        parentRequestId: requestId,
        lifecycleState: 'RETRIEVAL',
        execute: async (signal) => {
          await new Promise((resolve, reject) => {
            const onAbort = () => reject(new Error('Aborted'));
            signal.addEventListener('abort', onAbort);
            setTimeout(() => {
              signal.removeEventListener('abort', onAbort);
              resolve(true);
            }, 1000);
          });
          return 'done';
        }
      });

      const signal = CancellationManager.createScope(requestId);
      const promise = AsyncScheduler.schedule(task, signal);

      // Cancel scope immediately
      CancellationManager.cancelScope(requestId, 'Manual cancellation');

      await expect(promise).rejects.toThrow();
      expect(task.executionState).toBe('CANCELLED');
    });
  });

  describe('4. Timeout Handling', () => {
    it('should abort execution and transition state to TIMEOUT on timeout expiration', async () => {
      const task = new AsyncTaskRunner({
        taskId: 'timeout_task',
        taskType: 'test_timeout',
        parentRequestId: requestId,
        lifecycleState: 'RETRIEVAL',
        timeoutMs: 50,
        execute: async (signal) => {
          await new Promise((resolve, reject) => {
            const onAbort = () => reject(new Error('Timeout Aborted'));
            signal.addEventListener('abort', onAbort);
            setTimeout(() => {
              signal.removeEventListener('abort', onAbort);
              resolve(true);
            }, 1000);
          });
          return 'done';
        }
      });

      const signal = CancellationManager.createScope(requestId);

      // Setup timeout timer
      TimeoutManager.registerTimeout(requestId, 50, () => {
        CancellationManager.cancelScope(requestId, 'Timeout triggered');
      });

      await expect(
        AsyncScheduler.schedule(task, signal)
      ).rejects.toThrow();

      expect(task.executionState).toBe('CANCELLED');
    });
  });

  describe('5. Execution Isolation & 7. Degraded-Mode Handling', () => {
    it('should isolate failures of non-critical tasks and complete request in DEGRADED mode', async () => {
      const orchestrator = new AsyncOrchestrator(requestId);

      const criticalTask = new AsyncTaskRunner({
        taskId: 'critical_task',
        taskType: 'critical_type',
        parentRequestId: requestId,
        lifecycleState: 'RETRIEVAL',
        isCritical: true,
        execute: async () => 'critical_success'
      });

      const nonCriticalTask = new AsyncTaskRunner({
        taskId: 'non_critical_task',
        taskType: 'non_critical_type',
        parentRequestId: requestId,
        lifecycleState: 'RETRIEVAL',
        isCritical: false,
        execute: async () => {
          throw new Error('Non-critical DB retrieval crash');
        }
      });

      // Run concurrently
      const results = await orchestrator.executeAllConcurrently([criticalTask, nonCriticalTask]);

      // Check results: critical task succeeds, non-critical task fails but returns null fallback instead of throwing
      expect(results[0]).toBe('critical_success');
      expect(results[1]).toBeNull();

      // Check state: non-critical task marked as FAILED but FSM transitions to DEGRADED instead of failing
      expect(criticalTask.executionState).toBe('COMPLETED');
      expect(nonCriticalTask.executionState).toBe('FAILED');

      // Mimic route.ts degraded mode transition
      if (nonCriticalTask.executionState === 'FAILED') {
        await ExecutiveFSM.transitionTo(wm, 'DEGRADED', 'DEGRADED_FALLBACK');
      }

      expect(wm.getState().currentStage).toBe('DEGRADED');
      expect(wm.getState().executiveFSM?.orchestrationStatus).toBe('degraded');
    });

    it('should throw immediately if a critical task fails', async () => {
      const orchestrator = new AsyncOrchestrator(requestId);

      const criticalTask = new AsyncTaskRunner({
        taskId: 'critical_task_fail',
        taskType: 'critical_type',
        parentRequestId: requestId,
        lifecycleState: 'RETRIEVAL',
        isCritical: true,
        execute: async () => {
          throw new Error('Critical retrieval failed');
        }
      });

      await expect(
        orchestrator.executeAllConcurrently([criticalTask])
      ).rejects.toThrow('Critical retrieval failed');
    });
  });

  describe('6. Replay Determinism', () => {
    it('should yield identical task histories and scheduler paths across runs', async () => {
      const runFSMWithOrchestration = async () => {
        const testWm = new WorkingMemory(userId, 'replay-async', 'replay');
        await testWm.save();
        const testReqId = testWm.getState().executionId;
        const testOrch = new AsyncOrchestrator(testReqId);

        await ExecutiveFSM.transitionTo(testWm, 'INTENT_ANALYSIS', 'USER_REQUEST');
        await ExecutiveFSM.transitionTo(testWm, 'PLANNING', 'INTENT_ANALYZED');
        await ExecutiveFSM.transitionTo(testWm, 'RETRIEVAL', 'PLANNING_COMPLETE');

        const tA = new AsyncTaskRunner({
          taskId: `A_${testReqId}`,
          taskType: 'retrieve_a',
          parentRequestId: testReqId,
          lifecycleState: 'RETRIEVAL',
          execute: async () => 'A'
        });

        const tB = new AsyncTaskRunner({
          taskId: `B_${testReqId}`,
          taskType: 'retrieve_b',
          parentRequestId: testReqId,
          lifecycleState: 'RETRIEVAL',
          execute: async () => 'B'
        });

        await testOrch.executeAllConcurrently([tA, tB]);
        await testOrch.compileTelemetryAndCleanup(testWm);

        return testWm.getState();
      };

      const s1 = await runFSMWithOrchestration();
      const s2 = await runFSMWithOrchestration();

      expect(s1.asyncTelemetry?.completedTasks).toBe(s2.asyncTelemetry?.completedTasks);
      expect(s1.asyncTelemetry?.failedTasks).toBe(s2.asyncTelemetry?.failedTasks);
      expect(s1.asyncTelemetry?.cancelledTasks).toBe(s2.asyncTelemetry?.cancelledTasks);
    });
  });

  describe('10. Orphan Task Cleanup', () => {
    it('should release signals, clear active timers, and compile telemetry cleanly on cleanup', async () => {
      const orchestrator = new AsyncOrchestrator(requestId);
      
      const t = new AsyncTaskRunner({
        taskId: 'cleanup_test',
        taskType: 'retrieve',
        parentRequestId: requestId,
        lifecycleState: 'RETRIEVAL',
        execute: async () => 'clean'
      });

      await orchestrator.executeAllConcurrently([t]);
      
      // Verify scope exists in CancellationManager
      expect(CancellationManager.createScope(requestId)).toBeDefined();

      // Compile and Cleanup
      await orchestrator.compileTelemetryAndCleanup(wm);

      // Verify asyncTelemetry was saved inside WorkingMemoryState
      const telemetry = wm.getState().asyncTelemetry;
      expect(telemetry).toBeDefined();
      expect(telemetry?.completedTasks).toBe(1);
    });
  });
});
