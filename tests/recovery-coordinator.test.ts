import { z } from 'zod';
import { WorkingMemory } from '../lib/ai/working-memory/store';
import { ExecutiveFSM } from '../lib/ai/orchestration/executive-fsm';
import {
  FailureClassificationSystem,
  RetryGovernance,
  RuntimeDiagnosticsEngine,
  RuntimeStabilityGuard,
  RecoveryCoordinator
} from '../lib/ai/orchestration/recovery-coordinator';
import {
  ToolRegistry,
  ToolExecutionManager,
  ToolDefinition
} from '../lib/ai/orchestration/tool-orchestrator';
import { CancellationManager, TimeoutManager } from '../lib/ai/orchestration/async-runtime';
import { ToolExecutionContract, FailurePattern } from '../lib/ai/working-memory/types';

describe('RecoveryCoordinator & Resilience Core (D2.4)', () => {
  const userId = 'test-user-recovery';
  const sessionId = 'test-session-recovery';
  const query = 'test query for recovery';

  let wm: WorkingMemory;
  let requestId: string;

  const dummyContract: ToolExecutionContract = {
    toolId: 'dummy_tool',
    toolName: 'Dummy Tool',
    toolVersion: '1.0.0',
    criticality: 'CRITICAL',
    inputSchema: z.object({}),
    outputSchema: z.any(),
    timeoutMs: 1000,
    maxRetries: 0,
    degradationAllowed: false,
    failureSeverity: 'critical',
    failurePatterns: [],
    permissionScopes: { allowedStages: ['RETRIEVAL'] },
    resourceLimits: {}
  };

  const transitionToRetrieval = async () => {
    await ExecutiveFSM.transitionTo(wm, 'INTENT_ANALYSIS', 'USER_REQUEST');
    await ExecutiveFSM.transitionTo(wm, 'PLANNING', 'INTENT_ANALYZED');
    await ExecutiveFSM.transitionTo(wm, 'RETRIEVAL', 'PLANNING_COMPLETE');
  };

  beforeEach(async () => {
    wm = new WorkingMemory(userId, sessionId, query);
    await wm.save();
    requestId = wm.getState().executionId;
    ToolRegistry.clearRegistryForTest();
    RuntimeStabilityGuard.clearCooldown(requestId);
  });

  afterEach(() => {
    CancellationManager.releaseScope(requestId);
    TimeoutManager.clearScopeTimers(requestId);
    RuntimeStabilityGuard.clearCooldown(requestId);
    ToolRegistry.clearRegistryForTest();
  });

  describe('1. Failure Classification System', () => {
    const contract: ToolExecutionContract = {
      toolId: 'test_classification_tool',
      toolName: 'Classification Tool',
      toolVersion: '1.0.0',
      criticality: 'CRITICAL',
      inputSchema: z.object({}),
      outputSchema: z.any(),
      timeoutMs: 1000,
      maxRetries: 1,
      degradationAllowed: false,
      failureSeverity: 'critical',
      failurePatterns: [
        { match: 'connection error', classification: 'RESOURCE_FAILURE', retryPolicy: 'SAFE_ONCE' },
        { match: 'invalid key', classification: 'VALIDATION_FAILURE', retryPolicy: 'NONE' }
      ] as FailurePattern[],
      permissionScopes: { allowedStages: ['RETRIEVAL'] },
      resourceLimits: {}
    };

    it('should match errors against contract failure patterns', () => {
      const err1 = new Error('Database connection error occurred');
      const class1 = FailureClassificationSystem.classify(contract, err1);
      expect(class1).toBe('RESOURCE_FAILURE');

      const err2 = new Error('The auth check failed: invalid key');
      const class2 = FailureClassificationSystem.classify(contract, err2);
      expect(class2).toBe('VALIDATION_FAILURE');
    });

    it('should fall back to default heuristics when patterns do not match', () => {
      const errTimeout = new Error('Request has timed out after 5000ms');
      expect(FailureClassificationSystem.classify(contract, errTimeout)).toBe('TIMEOUT_FAILURE');

      const errValidation = new Error('Zod validation error');
      expect(FailureClassificationSystem.classify(contract, errValidation)).toBe('VALIDATION_FAILURE');

      const errCancel = new Error('The task was aborted');
      expect(FailureClassificationSystem.classify(contract, errCancel)).toBe('CANCELLATION_FAILURE');

      const errCritical = new Error('Unknown catastrophic failure');
      expect(FailureClassificationSystem.classify(contract, errCritical)).toBe('CRITICAL_FAILURE');
    });

    it('should map unknown errors to OPTIONAL_FAILURE if the tool is optional', () => {
      const optionalContract: ToolExecutionContract = {
        ...contract,
        criticality: 'OPTIONAL'
      };
      const errUnknown = new Error('Unknown internal error');
      expect(FailureClassificationSystem.classify(optionalContract, errUnknown)).toBe('OPTIONAL_FAILURE');
    });
  });

  describe('2. Bounded Retry Governance', () => {
    const contractWithPolicy = (policy: 'NONE' | 'SAFE_ONCE' | 'SAFE_TWICE', maxRetries = 2): ToolExecutionContract => ({
      toolId: 'retry_tool',
      toolName: 'Retry Tool',
      toolVersion: '1.0.0',
      criticality: 'CRITICAL',
      inputSchema: z.object({}),
      outputSchema: z.any(),
      timeoutMs: 1000,
      maxRetries,
      degradationAllowed: false,
      failureSeverity: 'high',
      failurePatterns: [
        { match: 'error', classification: 'RECOVERABLE_FAILURE', retryPolicy: policy }
      ],
      permissionScopes: { allowedStages: ['RETRIEVAL'] },
      resourceLimits: {}
    });

    it('should reject retries instantly under NONE policy', () => {
      const c = contractWithPolicy('NONE');
      const check = RetryGovernance.isRetryAllowed(c, 0, undefined);
      expect(check.allowed).toBe(false);
    });

    it('should allow retry up to 1 for SAFE_ONCE policy', () => {
      const c = contractWithPolicy('SAFE_ONCE');
      const check1 = RetryGovernance.isRetryAllowed(c, 0, undefined);
      expect(check1.allowed).toBe(true);

      const check2 = RetryGovernance.isRetryAllowed(c, 1, undefined);
      expect(check2.allowed).toBe(false);
    });

    it('should allow retry up to 2 for SAFE_TWICE policy', () => {
      const c = contractWithPolicy('SAFE_TWICE');
      const check1 = RetryGovernance.isRetryAllowed(c, 0, undefined);
      expect(check1.allowed).toBe(true);

      const check2 = RetryGovernance.isRetryAllowed(c, 1, undefined);
      expect(check2.allowed).toBe(true);

      const check3 = RetryGovernance.isRetryAllowed(c, 2, undefined);
      expect(check3.allowed).toBe(false);
    });

    it('should reject retries when total retry storm count is exceeded', () => {
      const c = contractWithPolicy('SAFE_TWICE');
      const diagnosticsReport = {
        failureCount: 3,
        retryCount: 3, // retry storm threshold hit
        degradedCount: 0,
        timeoutCount: 0,
        cancellationCount: 0,
        validationCount: 0,
        resourceCount: 0,
        stabilityWarnings: [],
        healthStatus: 'WARNING' as const
      };

      const check = RetryGovernance.isRetryAllowed(c, 0, diagnosticsReport, 3);
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Retry storm prevention');
    });
  });

  describe('3. Stability Guard Tiers & Escalation Rules', () => {
    it('should return HEALTHY when no diagnostics report is present', () => {
      const check = RuntimeStabilityGuard.checkInstability(undefined, requestId);
      expect(check.level).toBe('HEALTHY');
      expect(check.active).toBe(false);
    });

    it('should trigger LEVEL 1 Warning on single failure or retry', () => {
      const report = {
        failureCount: 1,
        retryCount: 0,
        degradedCount: 0,
        timeoutCount: 0,
        cancellationCount: 0,
        validationCount: 0,
        resourceCount: 0,
        stabilityWarnings: [],
        healthStatus: 'HEALTHY' as const
      };
      const check = RuntimeStabilityGuard.checkInstability(report, requestId);
      expect(check.level).toBe('WARNING');
      expect(check.active).toBe(true);
    });

    it('should trigger LEVEL 2 Degraded and activate cooldown window on multiple failures', () => {
      const report = {
        failureCount: 2,
        retryCount: 0,
        degradedCount: 0,
        timeoutCount: 0,
        cancellationCount: 0,
        validationCount: 0,
        resourceCount: 0,
        stabilityWarnings: [],
        healthStatus: 'HEALTHY' as const
      };
      const check = RuntimeStabilityGuard.checkInstability(report, requestId);
      expect(check.level).toBe('DEGRADED');
      expect(check.active).toBe(true);

      // Verify that during cooldown, checks return DEGRADED even if failureCount is low
      const checkCooldown = RuntimeStabilityGuard.checkInstability({
        ...report,
        failureCount: 0
      }, requestId);
      expect(checkCooldown.level).toBe('DEGRADED');
      expect(checkCooldown.reason).toContain('Cooldown window active');
    });

    it('should trigger LEVEL 3 Failed on repeated degradation or loop threshold breach', () => {
      const report = {
        failureCount: 2,
        retryCount: 0,
        degradedCount: 3, // hit 3 degraded transitions
        timeoutCount: 0,
        cancellationCount: 0,
        validationCount: 0,
        resourceCount: 0,
        stabilityWarnings: [],
        healthStatus: 'DEGRADED' as const
      };
      const check = RuntimeStabilityGuard.checkInstability(report, requestId);
      expect(check.level).toBe('FAILED');
      expect(check.active).toBe(true);
    });
  });

  describe('4. Recovery Coordinator Failure Flow & Budget limits', () => {
    it('should escalate to failed and abort requests if recovery budget is exceeded', async () => {
      const coordinator = new RecoveryCoordinator(wm);
      
      // Seed diagnostics with 6 failures (max is 5)
      await wm.updateState((s) => {
        s.diagnosticsReport = {
          failureCount: 6,
          retryCount: 0,
          degradedCount: 0,
          timeoutCount: 0,
          cancellationCount: 0,
          validationCount: 0,
          resourceCount: 0,
          stabilityWarnings: [],
          healthStatus: 'WARNING'
        };
      });

      const outcome = await coordinator.handleToolFailure('dummy_tool', dummyContract, new Error('Fail'), 0);
      expect(outcome.action).toBe('fail');
      expect(wm.getState().currentStage).toBe('FAILED');
    });

    it('should escalate to failed and abort requests if degradation budget is exceeded', async () => {
      const coordinator = new RecoveryCoordinator(wm);
      
      // Seed diagnostics with 4 degraded transitions (max is 3)
      await wm.updateState((s) => {
        s.diagnosticsReport = {
          failureCount: 1,
          retryCount: 0,
          degradedCount: 4,
          timeoutCount: 0,
          cancellationCount: 0,
          validationCount: 0,
          resourceCount: 0,
          stabilityWarnings: [],
          healthStatus: 'DEGRADED'
        };
      });

      const outcome = await coordinator.handleToolFailure('dummy_tool', dummyContract, new Error('Fail'), 0);
      expect(outcome.action).toBe('fail');
      expect(wm.getState().currentStage).toBe('FAILED');
    });

    it('should return retry action with deterministic delay when retry is permitted', async () => {
      const retryTool: ToolDefinition = {
        contract: {
          toolId: 'retryable_tool',
          toolName: 'Retryable Tool',
          toolVersion: '1.0.0',
          criticality: 'CRITICAL',
          inputSchema: z.object({}),
          outputSchema: z.any(),
          timeoutMs: 1000,
          maxRetries: 2,
          degradationAllowed: false,
          failureSeverity: 'high',
          failurePatterns: [
            { match: 'retry me', classification: 'RECOVERABLE_FAILURE', retryPolicy: 'SAFE_TWICE' }
          ],
          permissionScopes: { allowedStages: ['RETRIEVAL'] },
          resourceLimits: {}
        },
        execute: async () => 'ok'
      };

      ToolRegistry.register(retryTool);
      ToolRegistry.freeze();

      // Seed tool telemetry to simulate the execution manager environment
      await wm.updateState((s) => {
        s.toolTelemetry = [{
          toolId: 'retryable_tool',
          toolName: 'Retryable Tool',
          toolVersion: '1.0.0',
          requestId,
          executionOwner: userId,
          lifecycleState: 'EXECUTING',
          input: {},
          retryCount: 0,
          budgetUsage: { latencyMs: 0 },
          routingReasonCode: 'FSM_STAGE_MATCH',
          inputHash: 'xxx',
          startedAt: new Date().toISOString()
        }];
      });

      const coordinator = new RecoveryCoordinator(wm);
      const outcome = await coordinator.handleToolFailure('retryable_tool', retryTool.contract, new Error('retry me'), 0);

      expect(outcome.action).toBe('retry');
      expect(outcome.retryDelayMs).toBe(100);

      // Verify that diagnostics logged the retry increment
      const state = wm.getState();
      expect(state.diagnosticsReport?.retryCount).toBe(1);
      expect(state.recoveryTelemetry?.length).toBe(1);
      expect(state.recoveryTelemetry![0].recoveryOutcome).toBe('RECOVERED');
    });

    it('should gracefully degrade on optional tools', async () => {
      const optionalTool: ToolDefinition = {
        contract: {
          toolId: 'optional_tool',
          toolName: 'Optional Tool',
          toolVersion: '1.0.0',
          criticality: 'OPTIONAL',
          inputSchema: z.object({}),
          outputSchema: z.any(),
          timeoutMs: 1000,
          maxRetries: 0,
          degradationAllowed: true,
          failureSeverity: 'low',
          failurePatterns: [],
          permissionScopes: { allowedStages: ['RETRIEVAL'] },
          resourceLimits: {}
        },
        execute: async () => { throw new Error('crash'); }
      };

      ToolRegistry.register(optionalTool);
      ToolRegistry.freeze();

      await wm.updateState((s) => {
        s.toolTelemetry = [{
          toolId: 'optional_tool',
          toolName: 'Optional Tool',
          toolVersion: '1.0.0',
          requestId,
          executionOwner: userId,
          lifecycleState: 'EXECUTING',
          input: {},
          retryCount: 0,
          budgetUsage: { latencyMs: 0 },
          routingReasonCode: 'FSM_STAGE_MATCH',
          inputHash: 'xxx',
          startedAt: new Date().toISOString()
        }];
      });

      const coordinator = new RecoveryCoordinator(wm);
      const outcome = await coordinator.handleToolFailure('optional_tool', optionalTool.contract, new Error('crash'), 0);

      expect(outcome.action).toBe('degrade');
      expect(wm.getState().currentStage).toBe('DEGRADED');
      expect(wm.getState().diagnosticsReport?.degradedCount).toBe(1);
    });
  });

  describe('5. Telemetry Logging and Diagnostics Report Integration', () => {
    it('should increment metrics properly and serialize reports to memory state', async () => {
      await RuntimeDiagnosticsEngine.logAnomaly(wm, 'TIMEOUT_FAILURE', 'timeout detail');
      await RuntimeDiagnosticsEngine.incrementRetryCount(wm);
      await RuntimeDiagnosticsEngine.incrementDegradedCount(wm);
      await RuntimeDiagnosticsEngine.setHealthStatus(wm, 'WARNING');

      const state = wm.getState();
      expect(state.diagnosticsReport).toBeDefined();
      expect(state.diagnosticsReport?.failureCount).toBe(1);
      expect(state.diagnosticsReport?.timeoutCount).toBe(1);
      expect(state.diagnosticsReport?.retryCount).toBe(1);
      expect(state.diagnosticsReport?.degradedCount).toBe(1);
      expect(state.diagnosticsReport?.healthStatus).toBe('WARNING');
      expect(state.diagnosticsReport?.stabilityWarnings[0]).toContain('TIMEOUT_FAILURE: timeout detail');
    });

    it('should include correct recovery statistics in the RecoveryTelemetry schema', async () => {
      const coordinator = new RecoveryCoordinator(wm);
      
      // Setup minimal tool details inside telemetry
      await wm.updateState((s) => {
        s.toolTelemetry = [{
          toolId: 'dummy',
          toolName: 'Dummy',
          toolVersion: '1.0.0',
          requestId,
          executionOwner: userId,
          lifecycleState: 'EXECUTING',
          input: {},
          retryCount: 0,
          budgetUsage: { latencyMs: 0 },
          routingReasonCode: 'FSM_STAGE_MATCH',
          inputHash: 'xxx',
          startedAt: new Date().toISOString()
        }];
      });

      // Handle a recovery flow
      await coordinator.handleToolFailure('dummy', dummyContract, new Error('connection timeout'), 0);

      const state = wm.getState();
      expect(state.recoveryTelemetry).toBeDefined();
      expect(state.recoveryTelemetry!.length).toBeGreaterThan(0);

      const tel = state.recoveryTelemetry![0];
      expect(tel.failureType).toBe('TIMEOUT_FAILURE');
      expect(tel.retryStormCount).toBe(0);
      expect(typeof tel.escalationCount).toBe('number');
      expect(typeof tel.degradedCount).toBe('number');
      expect(typeof tel.retryStormCount).toBe('number');
    });
  });

  describe('6. Execution Manager Integration Tests', () => {
    it('should run a retry loop when the tool execution fails but retry is governingly allowed', async () => {
      let callCount = 0;
      const failingRetryTool: ToolDefinition = {
        contract: {
          toolId: 'failing_retry_tool',
          toolName: 'Failing Retry Tool',
          toolVersion: '1.0.0',
          criticality: 'CRITICAL',
          inputSchema: z.object({}),
          outputSchema: z.string(),
          timeoutMs: 1000,
          maxRetries: 1,
          degradationAllowed: false,
          failureSeverity: 'high',
          failurePatterns: [
            { match: 'fail', classification: 'RECOVERABLE_FAILURE', retryPolicy: 'SAFE_ONCE' }
          ],
          permissionScopes: { allowedStages: ['RETRIEVAL'] },
          resourceLimits: {}
        },
        execute: async () => {
          callCount++;
          if (callCount === 1) {
            throw new Error('fail');
          }
          return 'recovered value';
        }
      };

      ToolRegistry.register(failingRetryTool);
      ToolRegistry.freeze();

      const manager = new ToolExecutionManager(wm);
      await transitionToRetrieval();

      const result = await manager.execute('failing_retry_tool', {});
      expect(result).toBe('recovered value');
      expect(callCount).toBe(2);

      const telemetry = wm.getState().toolTelemetry || [];
      const entry = telemetry.find(t => t.toolId === 'failing_retry_tool');
      expect(entry?.lifecycleState).toBe('COMPLETED');
      expect(entry?.retryCount).toBe(1);
    });

    it('should stop retrying and throw error on tool failure once max retries are exceeded', async () => {
      let callCount = 0;
      const alwaysFailsTool: ToolDefinition = {
        contract: {
          toolId: 'always_fails',
          toolName: 'Always Fails Tool',
          toolVersion: '1.0.0',
          criticality: 'CRITICAL',
          inputSchema: z.object({}),
          outputSchema: z.string(),
          timeoutMs: 1000,
          maxRetries: 1,
          degradationAllowed: false,
          failureSeverity: 'high',
          failurePatterns: [
            { match: 'fail', classification: 'RECOVERABLE_FAILURE', retryPolicy: 'SAFE_ONCE' }
          ],
          permissionScopes: { allowedStages: ['RETRIEVAL'] },
          resourceLimits: {}
        },
        execute: async () => {
          callCount++;
          throw new Error('fail');
        }
      };

      ToolRegistry.register(alwaysFailsTool);
      ToolRegistry.freeze();

      const manager = new ToolExecutionManager(wm);
      await transitionToRetrieval();

      await expect(
        manager.execute('always_fails', {})
      ).rejects.toThrow('fail');

      expect(callCount).toBe(2); // 1 original + 1 retry
      expect(wm.getState().currentStage).toBe('FAILED');
    });
  });
});
