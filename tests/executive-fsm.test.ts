import { WorkingMemory } from '../lib/ai/working-memory/store';
import { ExecutiveFSM, FSMTransitionError, TransitionRegistry, StateGuards } from '../lib/ai/orchestration/executive-fsm';
import { ExecutiveLifecycleState } from '../lib/ai/working-memory/types';

describe('ExecutiveFSM Core (D2.1)', () => {
  const userId = 'test-user-fsm';
  const sessionId = 'test-session-fsm';
  const query = 'test query for FSM';

  let wm: WorkingMemory;

  beforeEach(async () => {
    wm = new WorkingMemory(userId, sessionId, query);
    await wm.save();
  });

  describe('1. Valid Transitions & 8. Lifecycle Integrity', () => {
    it('should successfully orchestrate a full valid lifecycle flow', async () => {
      // IDLE (default) -> INTENT_ANALYSIS
      await ExecutiveFSM.transitionTo(wm, 'INTENT_ANALYSIS', 'USER_REQUEST');
      expect(wm.getState().currentStage).toBe('INTENT_ANALYSIS');

      // INTENT_ANALYSIS -> PLANNING
      await ExecutiveFSM.transitionTo(wm, 'PLANNING', 'INTENT_ANALYZED', { intent: 'chat' });
      expect(wm.getState().currentStage).toBe('PLANNING');

      // PLANNING -> RETRIEVAL
      await ExecutiveFSM.transitionTo(wm, 'RETRIEVAL', 'PLANNING_COMPLETE');
      expect(wm.getState().currentStage).toBe('RETRIEVAL');

      // RETRIEVAL -> ARBITRATION
      await ExecutiveFSM.transitionTo(wm, 'ARBITRATION', 'RETRIEVAL_COMPLETE');
      expect(wm.getState().currentStage).toBe('ARBITRATION');

      // ARBITRATION -> GENERATION
      await ExecutiveFSM.transitionTo(wm, 'GENERATION', 'ARBITRATION_COMPLETE', {
        arbitrationSnapshot: { dummy: true }
      });
      expect(wm.getState().currentStage).toBe('GENERATION');

      // GENERATION -> REFLECTION
      await ExecutiveFSM.transitionTo(wm, 'REFLECTION', 'GENERATION_COMPLETE');
      expect(wm.getState().currentStage).toBe('REFLECTION');

      // REFLECTION -> PERSISTENCE
      await ExecutiveFSM.transitionTo(wm, 'PERSISTENCE', 'REFLECTION_COMPLETE', {
        reflectionSnapshot: { confidence: 0.95 }
      });
      expect(wm.getState().currentStage).toBe('PERSISTENCE');

      // PERSISTENCE -> COMPLETED
      await ExecutiveFSM.transitionTo(wm, 'COMPLETED', 'PERSISTENCE_COMPLETE');
      expect(wm.getState().currentStage).toBe('COMPLETED');

      // Check telemetry
      const telemetry = wm.getState().executiveFSM;
      expect(telemetry).toBeDefined();
      expect(telemetry?.transitionCount).toBe(8);
      expect(telemetry?.currentState).toBe('COMPLETED');
      expect(telemetry?.orchestrationStatus).toBe('completed');
      expect(telemetry?.runtimeVersion).toBe('1.0.0');

      // Check context
      const context = wm.getState().executionContext;
      expect(context).toBeDefined();
      expect(context?.currentState).toBe('COMPLETED');
      expect(context?.activeIntent).toBe('chat');
    });
  });

  describe('2. Invalid Transition Rejection', () => {
    it('should reject invalid transitions and throw explicit FSMTransitionError', async () => {
      // Transition from IDLE to RETRIEVAL directly (invalid)
      await expect(
        ExecutiveFSM.transitionTo(wm, 'RETRIEVAL', 'RETRIEVAL_COMPLETE')
      ).rejects.toThrow(FSMTransitionError);

      try {
        await ExecutiveFSM.transitionTo(wm, 'RETRIEVAL', 'RETRIEVAL_COMPLETE');
      } catch (err: any) {
        expect(err.message).toContain('FSM transition validation failed. attempted: IDLE → RETRIEVAL, rejected: invalid lifecycle regression or invalid transition path');
      }
    });

    it('should reject invalid backward regression (e.g. GENERATION -> RETRIEVAL)', async () => {
      await ExecutiveFSM.transitionTo(wm, 'INTENT_ANALYSIS', 'USER_REQUEST');
      await ExecutiveFSM.transitionTo(wm, 'PLANNING', 'INTENT_ANALYZED');
      await ExecutiveFSM.transitionTo(wm, 'RETRIEVAL', 'PLANNING_COMPLETE');
      await ExecutiveFSM.transitionTo(wm, 'ARBITRATION', 'RETRIEVAL_COMPLETE');
      await ExecutiveFSM.transitionTo(wm, 'GENERATION', 'ARBITRATION_COMPLETE');

      await expect(
        ExecutiveFSM.transitionTo(wm, 'RETRIEVAL', 'RETRIEVAL_COMPLETE')
      ).rejects.toThrow(FSMTransitionError);

      try {
        await ExecutiveFSM.transitionTo(wm, 'RETRIEVAL', 'RETRIEVAL_COMPLETE');
      } catch (err: any) {
        expect(err.message).toContain('attempted: GENERATION → RETRIEVAL');
        expect(err.message).toContain('rejected: invalid lifecycle regression or invalid transition path');
      }
    });
  });

  describe('3. Replay Determinism', () => {
    it('should generate identical state histories and telemetry across runs with same inputs', async () => {
      const runFSM = async (userIn: string) => {
        const testWm = new WorkingMemory(userId, 'replay-session', userIn);
        await testWm.save();
        await ExecutiveFSM.transitionTo(testWm, 'INTENT_ANALYSIS', 'USER_REQUEST');
        await ExecutiveFSM.transitionTo(testWm, 'PLANNING', 'INTENT_ANALYZED');
        await ExecutiveFSM.transitionTo(testWm, 'RETRIEVAL', 'PLANNING_COMPLETE');
        await ExecutiveFSM.transitionTo(testWm, 'ARBITRATION', 'RETRIEVAL_COMPLETE');
        await ExecutiveFSM.transitionTo(testWm, 'GENERATION', 'ARBITRATION_COMPLETE');
        await ExecutiveFSM.transitionTo(testWm, 'REFLECTION', 'GENERATION_COMPLETE');
        await ExecutiveFSM.transitionTo(testWm, 'PERSISTENCE', 'REFLECTION_COMPLETE');
        await ExecutiveFSM.transitionTo(testWm, 'COMPLETED', 'PERSISTENCE_COMPLETE');
        return testWm.getState();
      };

      const state1 = await runFSM('test replay');
      const state2 = await runFSM('test replay');

      // Verify execution ids are different but FSM flows, counts, histories, states, and logic are identical
      expect(state1.executiveFSM?.transitionCount).toBe(state2.executiveFSM?.transitionCount);
      expect(state1.executiveFSM?.currentState).toBe(state2.executiveFSM?.currentState);
      expect(state1.executiveFSM?.orchestrationStatus).toBe(state2.executiveFSM?.orchestrationStatus);

      // Compare transition history lengths and mapped path
      const path1 = state1.executiveFSM?.transitionHistory.map(h => `${h.from}->${h.to}`);
      const path2 = state2.executiveFSM?.transitionHistory.map(h => `${h.from}->${h.to}`);
      expect(path1).toEqual(path2);
    });
  });

  describe('5. Timeout, 6. Degraded Mode, & 7. Cancellation Handling', () => {
    it('should transition to TIMEOUT cleanly via triggerTimeout', async () => {
      await ExecutiveFSM.triggerTimeout(wm, 'Gemini request timed out after 10000ms');
      expect(wm.getState().currentStage).toBe('TIMEOUT');
      expect(wm.getState().executiveFSM?.orchestrationStatus).toBe('failed');
      expect(wm.getState().executiveFSM?.failureState).toBe('TIMEOUT');
    });

    it('should transition to CANCELLED cleanly via triggerCancellation', async () => {
      await ExecutiveFSM.triggerCancellation(wm, 'User cancelled chat thread execution');
      expect(wm.getState().currentStage).toBe('CANCELLED');
      expect(wm.getState().executiveFSM?.orchestrationStatus).toBe('failed');
      expect(wm.getState().executiveFSM?.failureState).toBe('CANCELLED');
    });

    it('should transition to DEGRADED mode cleanly via triggerDegraded', async () => {
      await ExecutiveFSM.triggerDegraded(wm, 'Telemetry error occurred, degraded mode activated');
      expect(wm.getState().currentStage).toBe('DEGRADED');
      expect(wm.getState().executiveFSM?.orchestrationStatus).toBe('degraded');
      expect(wm.getState().executiveFSM?.failureState).toBe('DEGRADED');
    });
  });

  describe('9. State Guard Enforcement', () => {
    it('should prevent entering GENERATION if ARBITRATION is missing in history', async () => {
      await ExecutiveFSM.transitionTo(wm, 'INTENT_ANALYSIS', 'USER_REQUEST');
      await ExecutiveFSM.transitionTo(wm, 'PLANNING', 'INTENT_ANALYZED');
      await ExecutiveFSM.transitionTo(wm, 'RETRIEVAL', 'PLANNING_COMPLETE');

      // Try transitioning to GENERATION directly (skipping ARBITRATION)
      // Transition is allowed by ALLOWED_TRANSITIONS mapping for fallback tests,
      // but StateGuards should block it dynamically.
      // Wait, let's verify if RETRIEVAL -> GENERATION is allowed in ALLOWED_TRANSITIONS:
      // It is NOT allowed in ALLOWED_TRANSITIONS anyway! But let's check StateGuards verifyStateTransition logic.
      const stateCopy = wm.getState();
      
      expect(() => {
        StateGuards.verifyStateTransition(stateCopy, 'RETRIEVAL', 'GENERATION');
      }).toThrow('cannot enter GENERATION before ARBITRATION completes');
    });

    it('should prevent entering PERSISTENCE if REFLECTION is missing in history', async () => {
      const stateCopy = wm.getState();
      
      expect(() => {
        StateGuards.verifyStateTransition(stateCopy, 'GENERATION', 'PERSISTENCE');
      }).toThrow('cannot persist before REFLECTION completes');
    });

    it('should block any transition attempted from a terminal state', async () => {
      await ExecutiveFSM.triggerTimeout(wm, 'Timeout');
      expect(StateGuards.isTerminalState(wm.getState().currentStage)).toBe(true);

      // Attempting any transition from TIMEOUT should be blocked by StateGuards
      const stateCopy = wm.getState();
      expect(() => {
        StateGuards.verifyStateTransition(stateCopy, 'TIMEOUT', 'IDLE');
      }).toThrow('cannot transition from a terminal state back into execution');
    });
  });

  describe('10. Orchestration Latency Stability', () => {
    it('should perform transition validations with minimal latency overhead', async () => {
      const start = Date.now();
      const iterations = 200;

      for (let i = 0; i < iterations; i++) {
        TransitionRegistry.validateTransition('IDLE', 'INTENT_ANALYSIS');
      }

      const duration = Date.now() - start;
      const avgDuration = duration / iterations;
      console.log(`Average Transition Registry validation latency: ${avgDuration}ms`);
      expect(avgDuration).toBeLessThan(1.0); // Should be well below 1ms per validation
    });
  });
});
