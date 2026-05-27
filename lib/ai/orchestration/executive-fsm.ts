import { logger } from '../../logger';
import { 
  ExecutiveLifecycleState, 
  WorkingMemoryStage, 
  TransitionCause, 
  FSMTelemetry, 
  ExecutionContext, 
  WorkingMemoryState,
  ALLOWED_TRANSITIONS
} from '../working-memory/types';
import { WorkingMemory } from '../working-memory/store';

export class FSMTransitionError extends Error {
  constructor(
    public from: ExecutiveLifecycleState,
    public to: ExecutiveLifecycleState,
    public reason: string
  ) {
    super(`FSM transition validation failed. attempted: ${from} → ${to}, rejected: ${reason}`);
    this.name = 'FSMTransitionError';
  }
}

export class TransitionRegistry {
  /**
   * Deterministically validates if a transition from `from` to `to` is permitted.
   * Throws an explicit FSMTransitionError if invalid, capturing the trace.
   */
  public static validateTransition(from: ExecutiveLifecycleState, to: ExecutiveLifecycleState): void {
    const allowed = ALLOWED_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      const errorMsg = `invalid lifecycle regression or invalid transition path`;
      logger.error('FSM transition validation error', { from, to, allowed });
      throw new FSMTransitionError(from, to, errorMsg);
    }
  }
}

export class StateGuards {
  /**
   * Centralized helper to check if a state is terminal.
   */
  public static isTerminalState(state: ExecutiveLifecycleState): boolean {
    return ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'].includes(state);
  }

  /**
   * Semantic guards for state integrity.
   */
  public static verifyStateTransition(
    state: WorkingMemoryState,
    from: ExecutiveLifecycleState,
    to: ExecutiveLifecycleState
  ): void {
    // 1. Cannot transition from a terminal state back into execution states
    if (this.isTerminalState(from)) {
      throw new FSMTransitionError(from, to, 'cannot transition from a terminal state back into execution');
    }

    // 2. Cannot enter GENERATION before ARBITRATION completes
    if (to === 'GENERATION') {
      const hasArbitrationInHistory = state.executiveFSM?.transitionHistory.some(h => h.to === 'ARBITRATION');
      const hasArbitrationResult = state.retrievalStaging?.metadata?.arbitrationTraces !== undefined && state.retrievalStaging?.metadata?.arbitrationTraces !== null;
      if (!hasArbitrationInHistory && !hasArbitrationResult) {
        throw new FSMTransitionError(from, to, 'cannot enter GENERATION before ARBITRATION completes');
      }
    }

    // 3. Cannot persist before REFLECTION completes
    if (to === 'PERSISTENCE') {
      const hasReflectionInHistory = state.executiveFSM?.transitionHistory.some(h => h.to === 'REFLECTION');
      const hasReflectionResult = state.reflectionBuffer !== undefined && state.reflectionBuffer !== null;
      if (!hasReflectionInHistory && !hasReflectionResult) {
        throw new FSMTransitionError(from, to, 'cannot persist before REFLECTION completes');
      }
    }
  }
}

export class ExecutiveFSM {
  private static RUNTIME_VERSION = '1.0.0';

  /**
   * Initializes empty telemetry structure.
   */
  public static createDefaultTelemetry(initialState: ExecutiveLifecycleState = 'IDLE'): FSMTelemetry {
    return {
      currentState: initialState,
      previousState: null,
      transitionHistory: [],
      transitionCount: 0,
      transitionDurations: {},
      runtimeLatency: 0,
      failureState: null,
      orchestrationStatus: 'idle',
      runtimeVersion: this.RUNTIME_VERSION
    };
  }

  /**
   * Initializes empty execution context.
   */
  public static createDefaultContext(
    execId: string, 
    initialState: ExecutiveLifecycleState = 'IDLE'
  ): ExecutionContext {
    return {
      currentState: initialState,
      previousState: null,
      activeIntent: null,
      runtimeStartTime: Date.now(),
      transitionHistory: [],
      activeRequestId: execId,
      arbitrationSnapshot: null,
      reflectionSnapshot: null,
      persistenceStatus: 'none'
    };
  }

  /**
   * Handles explicit, deterministic, replay-safe transition.
   */
  public static async transitionTo(
    wm: WorkingMemory,
    targetState: ExecutiveLifecycleState,
    cause: TransitionCause,
    options?: {
      intent?: string;
      arbitrationSnapshot?: any;
      reflectionSnapshot?: any;
      persistenceStatus?: 'pending' | 'success' | 'failed' | 'none';
      causeMessage?: string;
    }
  ): Promise<void> {
    const timestampStr = new Date().toISOString();
    const now = Date.now();

    await wm.updateState((state) => {
      const current = state.currentStage || 'IDLE';

      // 1. Transition Registry Check
      TransitionRegistry.validateTransition(current, targetState);

      // 2. State Guards Check
      StateGuards.verifyStateTransition(state, current, targetState);

      // 3. Initialize telemetry and context if they do not exist
      if (!state.executiveFSM) {
        state.executiveFSM = this.createDefaultTelemetry(current);
      }
      if (!state.executionContext) {
        state.executionContext = this.createDefaultContext(state.executionId, current);
      }

      // Calculate transition duration of previous state
      let durationMs = 0;
      const history = state.executiveFSM.transitionHistory;
      if (history.length > 0) {
        const lastEntry = history[history.length - 1];
        const lastTime = new Date(lastEntry.timestamp).getTime();
        durationMs = now - lastTime;
        lastEntry.durationMs = durationMs;
        
        // Record accumulated duration for that specific state
        const prev = lastEntry.to;
        state.executiveFSM.transitionDurations[prev] = 
          (state.executiveFSM.transitionDurations[prev] || 0) + durationMs;
      }

      // Update state markers
      state.executiveFSM.previousState = current;
      state.executiveFSM.currentState = targetState;
      state.executionContext.previousState = current;
      state.executionContext.currentState = targetState;

      // Update transition histories
      state.executiveFSM.transitionHistory.push({
        from: current,
        to: targetState,
        timestamp: timestampStr,
        cause: cause,
        durationMs: 0 // Will be set in next transition
      });

      state.executionContext.transitionHistory.push({
        from: current,
        to: targetState,
        timestamp: timestampStr,
        cause: cause
      });

      state.executiveFSM.transitionCount++;

      // Apply snapshots and status options
      if (options?.intent) {
        state.executionContext.activeIntent = options.intent;
      }
      if (options?.arbitrationSnapshot) {
        state.executionContext.arbitrationSnapshot = options.arbitrationSnapshot;
      }
      if (options?.reflectionSnapshot) {
        state.executionContext.reflectionSnapshot = options.reflectionSnapshot;
      }
      if (options?.persistenceStatus) {
        state.executionContext.persistenceStatus = options.persistenceStatus;
      }

      // Update FSM overall orchestrationStatus
      if (targetState === 'DEGRADED') {
        state.executiveFSM.orchestrationStatus = 'degraded';
        state.executiveFSM.failureState = 'DEGRADED';
      } else if (StateGuards.isTerminalState(targetState)) {
        if (targetState === 'COMPLETED') {
          state.executiveFSM.orchestrationStatus = 'completed';
          state.lifecycleStatus = 'completed';
        } else {
          state.executiveFSM.orchestrationStatus = 'failed';
          state.executiveFSM.failureState = targetState;
          state.lifecycleStatus = 'completed'; // terminal for execution lifecycle
          state.cleanupReason = targetState.toLowerCase();
        }
      } else {
        state.executiveFSM.orchestrationStatus = 
          state.executiveFSM.orchestrationStatus === 'degraded' ? 'degraded' : 'running';
      }

      // Sync the main Working Memory current stage
      state.currentStage = targetState;

      // Update runtime latency
      const startMs = new Date(state.createdAt).getTime();
      state.executiveFSM.runtimeLatency = now - startMs;
      state.updatedAt = timestampStr;
    });

    logger.debug('FSM transition completed', {
      executionId: wm.getState().executionId,
      from: wm.getState().executionContext?.previousState,
      to: targetState,
      cause
    });
  }

  /**
   * Helper methods for error / failure orchestration
   */
  public static async triggerFailure(wm: WorkingMemory, cause: string): Promise<void> {
    await this.transitionTo(wm, 'FAILED', 'RUNTIME_ERROR', {
      causeMessage: cause
    });
  }

  public static async triggerTimeout(wm: WorkingMemory, cause: string): Promise<void> {
    await this.transitionTo(wm, 'TIMEOUT', 'TIMEOUT_TRIGGERED', {
      causeMessage: cause
    });
  }

  public static async triggerCancellation(wm: WorkingMemory, cause: string): Promise<void> {
    await this.transitionTo(wm, 'CANCELLED', 'CANCELLATION_TRIGGERED', {
      causeMessage: cause
    });
  }

  public static async triggerDegraded(wm: WorkingMemory, cause: string): Promise<void> {
    await this.transitionTo(wm, 'DEGRADED', 'DEGRADED_FALLBACK', {
      causeMessage: cause
    });
  }
}
