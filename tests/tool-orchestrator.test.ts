import { z } from 'zod';
import { WorkingMemory } from '../lib/ai/working-memory/store';
import { ExecutiveFSM } from '../lib/ai/orchestration/executive-fsm';
import {
  ToolRegistry,
  ToolRouter,
  ToolVerificationLayer,
  ToolExecutionManager,
  ToolDefinition
} from '../lib/ai/orchestration/tool-orchestrator';
import { CancellationManager, TimeoutManager } from '../lib/ai/orchestration/async-runtime';

describe('ToolOrchestrator Core (D2.3)', () => {
  const userId = 'test-user-tool';
  const sessionId = 'test-session-tool';
  const query = 'test query for tools';

  let wm: WorkingMemory;
  let requestId: string;

  const transitionToRetrieval = async () => {
    await ExecutiveFSM.transitionTo(wm, 'INTENT_ANALYSIS', 'USER_REQUEST');
    await ExecutiveFSM.transitionTo(wm, 'PLANNING', 'INTENT_ANALYZED');
    await ExecutiveFSM.transitionTo(wm, 'RETRIEVAL', 'PLANNING_COMPLETE');
  };

  beforeEach(async () => {
    wm = new WorkingMemory(userId, sessionId, query);
    await wm.save();
    requestId = wm.getState().executionId;

    // Reset registry to clean state for testing
    ToolRegistry.clearRegistryForTest();
  });

  afterEach(() => {
    CancellationManager.releaseScope(requestId);
    TimeoutManager.clearScopeTimers(requestId);
    ToolRegistry.clearRegistryForTest();
  });

  describe('1. Deterministic Tool Routing & Permission Scopes', () => {
    it('should route matching tools and reject unauthorized stage execution', async () => {
      const testTool: ToolDefinition = {
        contract: {
          toolId: 'test_retrieve_tool',
          toolName: 'Test Retrieve',
          toolVersion: '1.0.0',
          criticality: 'CRITICAL',
          inputSchema: z.object({ value: z.string() }),
          outputSchema: z.string(),
          timeoutMs: 5000,
          maxRetries: 0,
          permissionScopes: {
            allowedStages: ['RETRIEVAL']
          },
          resourceLimits: {}
        },
        execute: async (input) => `retrieved: ${input.value}`
      };

      ToolRegistry.register(testTool);
      ToolRegistry.freeze();

      // Should succeed in RETRIEVAL stage
      const routed = ToolRouter.route('test_retrieve_tool', 'RETRIEVAL', null);
      expect(routed.contract.toolId).toBe('test_retrieve_tool');

      // Should throw security exception in PLANNING stage
      expect(() => {
        ToolRouter.route('test_retrieve_tool', 'PLANNING', null);
      }).toThrow('Security Exception');
    });

    it('should respect intent-scoped permissions when specified', () => {
      const testTool: ToolDefinition = {
        contract: {
          toolId: 'intent_tool',
          toolName: 'Intent Tool',
          toolVersion: '1.0.0',
          criticality: 'CRITICAL',
          inputSchema: z.object({}),
          outputSchema: z.any(),
          timeoutMs: 1000,
          maxRetries: 0,
          permissionScopes: {
            allowedStages: ['RETRIEVAL'],
            allowedIntents: ['schedule']
          },
          resourceLimits: {}
        },
        execute: async () => 'ok'
      };

      ToolRegistry.register(testTool);
      ToolRegistry.freeze();

      // Allowed with schedule intent
      const routed = ToolRouter.route('intent_tool', 'RETRIEVAL', 'schedule');
      expect(routed).toBeDefined();

      // Disallowed with general intent
      expect(() => {
        ToolRouter.route('intent_tool', 'RETRIEVAL', 'general');
      }).toThrow('Security Exception');
    });
  });

  describe('2. Contract Validation (Input / Output)', () => {
    it('should parse valid inputs/outputs and reject malformed ones', async () => {
      const testTool: ToolDefinition = {
        contract: {
          toolId: 'contract_tool',
          toolName: 'Contract Tool',
          toolVersion: '1.0.0',
          criticality: 'CRITICAL',
          inputSchema: z.object({ count: z.number() }),
          outputSchema: z.object({ success: z.boolean() }),
          timeoutMs: 1000,
          maxRetries: 0,
          permissionScopes: { allowedStages: ['RETRIEVAL'] },
          resourceLimits: {}
        },
        execute: async (input) => {
          return { success: input.count > 0 };
        }
      };

      ToolRegistry.register(testTool);
      ToolRegistry.freeze();

      const manager = new ToolExecutionManager(wm);
      await transitionToRetrieval();

      // Valid run
      const result = await manager.execute('contract_tool', { count: 5 });
      expect(result).toEqual({ success: true });

      // Malformed input rejection
      await expect(
        manager.execute('contract_tool', { count: 'invalid' })
      ).rejects.toThrow('Contract Violation');
    });

    it('should throw contract violation when tool execution returns malformed output', async () => {
      const badOutputTool: ToolDefinition = {
        contract: {
          toolId: 'bad_output_tool',
          toolName: 'Bad Output Tool',
          toolVersion: '1.0.0',
          criticality: 'CRITICAL',
          inputSchema: z.object({}),
          outputSchema: z.object({ count: z.number() }),
          timeoutMs: 1000,
          maxRetries: 0,
          permissionScopes: { allowedStages: ['RETRIEVAL'] },
          resourceLimits: {}
        },
        // Returns string instead of count: number
        execute: async () => ({ count: 'not a number' })
      };

      ToolRegistry.register(badOutputTool);
      ToolRegistry.freeze();

      const manager = new ToolExecutionManager(wm);
      await transitionToRetrieval();

      await expect(
        manager.execute('bad_output_tool', {})
      ).rejects.toThrow('Contract Violation');
    });
  });

  describe('3. Execution Budget Enforcement', () => {
    it('should enforce max payload size limit check for inputs', async () => {
      const payloadLimitTool: ToolDefinition = {
        contract: {
          toolId: 'payload_limit_tool',
          toolName: 'Payload Limit Tool',
          toolVersion: '1.0.0',
          criticality: 'CRITICAL',
          inputSchema: z.object({ text: z.string() }),
          outputSchema: z.string(),
          timeoutMs: 1000,
          maxRetries: 0,
          permissionScopes: { allowedStages: ['RETRIEVAL'] },
          resourceLimits: {
            maxPayloadBytes: 30 // small limit
          }
        },
        execute: async (input) => input.text
      };

      ToolRegistry.register(payloadLimitTool);
      ToolRegistry.freeze();

      const manager = new ToolExecutionManager(wm);
      await transitionToRetrieval();

      // 10 chars is ok
      const okResult = await manager.execute('payload_limit_tool', { text: '1234567890' });
      expect(okResult).toBe('1234567890');

      // 30 chars exceeds limit
      await expect(
        manager.execute('payload_limit_tool', { text: '123456789012345678901234567890' })
      ).rejects.toThrow('Resource Limit Exceeded');
    });
  });

  describe('4. Timeout & Cancellation Governance', () => {
    it('should abort execution and log TIMEOUT telemetry if tool exceeds timeoutMs limit', async () => {
      const slowTool: ToolDefinition = {
        contract: {
          toolId: 'slow_tool',
          toolName: 'Slow Tool',
          toolVersion: '1.0.0',
          criticality: 'CRITICAL',
          inputSchema: z.object({}),
          outputSchema: z.string(),
          timeoutMs: 50, // 50ms timeout
          maxRetries: 0,
          permissionScopes: { allowedStages: ['RETRIEVAL'] },
          resourceLimits: {}
        },
        execute: async (input, signal) => {
          await new Promise((resolve, reject) => {
            const onAbort = () => reject(new Error('Aborted'));
            signal.addEventListener('abort', onAbort);
            setTimeout(() => {
              signal.removeEventListener('abort', onAbort);
              resolve(true);
            }, 500);
          });
          return 'done';
        }
      };

      ToolRegistry.register(slowTool);
      ToolRegistry.freeze();

      const manager = new ToolExecutionManager(wm);
      await transitionToRetrieval();

      await expect(
        manager.execute('slow_tool', {})
      ).rejects.toThrow();

      const telemetry = wm.getState().toolTelemetry || [];
      const entry = telemetry.find(t => t.toolId === 'slow_tool');
      expect(entry).toBeDefined();
      expect(entry?.lifecycleState).toBe('TIMEOUT');
    });

    it('should cancel active execution on abort signal propagation', async () => {
      const cancelTool: ToolDefinition = {
        contract: {
          toolId: 'cancel_tool',
          toolName: 'Cancellable Tool',
          toolVersion: '1.0.0',
          criticality: 'CRITICAL',
          inputSchema: z.object({}),
          outputSchema: z.string(),
          timeoutMs: 5000,
          maxRetries: 0,
          permissionScopes: { allowedStages: ['RETRIEVAL'] },
          resourceLimits: {}
        },
        execute: async (input, signal) => {
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
      };

      ToolRegistry.register(cancelTool);
      ToolRegistry.freeze();

      const manager = new ToolExecutionManager(wm);
      await transitionToRetrieval();

      const promise = manager.execute('cancel_tool', {});
      
      // Cancel request scope manually
      CancellationManager.cancelScope(requestId, 'Manual abort');

      await expect(promise).rejects.toThrow();

      const telemetry = wm.getState().toolTelemetry || [];
      const entry = telemetry.find(t => t.toolId === 'cancel_tool');
      expect(entry?.lifecycleState).toBe('CANCELLED');
    });
  });

  describe('5. Execution Isolation & Degraded Flow', () => {
    it('should degrade gracefully on optional tool failure', async () => {
      const optionalCrashTool: ToolDefinition = {
        contract: {
          toolId: 'optional_crash',
          toolName: 'Optional Crash Tool',
          toolVersion: '1.0.0',
          criticality: 'OPTIONAL', // non-critical
          inputSchema: z.object({}),
          outputSchema: z.string(),
          timeoutMs: 1000,
          maxRetries: 0,
          permissionScopes: { allowedStages: ['RETRIEVAL'] },
          resourceLimits: {}
        },
        execute: async () => {
          throw new Error('Database connection failed');
        }
      };

      ToolRegistry.register(optionalCrashTool);
      ToolRegistry.freeze();

      const manager = new ToolExecutionManager(wm);
      await transitionToRetrieval();

      // Execution should resolve to null instead of throwing error
      const result = await manager.execute('optional_crash', {});
      expect(result).toBeNull();

      const telemetry = wm.getState().toolTelemetry || [];
      const entry = telemetry.find(t => t.toolId === 'optional_crash');
      expect(entry?.lifecycleState).toBe('DEGRADED');
    });
  });

  describe('6. Replay & Telemetry Expectations', () => {
    it('should record complete telemetry trails and output hashes', async () => {
      const echoTool: ToolDefinition = {
        contract: {
          toolId: 'echo_tool',
          toolName: 'Echo Tool',
          toolVersion: '1.0.0',
          criticality: 'CRITICAL',
          inputSchema: z.object({ message: z.string() }),
          outputSchema: z.string(),
          timeoutMs: 2000,
          maxRetries: 0,
          permissionScopes: { allowedStages: ['RETRIEVAL'] },
          resourceLimits: {}
        },
        execute: async (input) => input.message
      };

      ToolRegistry.register(echoTool);
      ToolRegistry.freeze();

      const manager = new ToolExecutionManager(wm);
      await transitionToRetrieval();

      await manager.execute('echo_tool', { message: 'hello replay' });

      const state = wm.getState();
      expect(state.toolTelemetry).toBeDefined();
      expect(state.toolTelemetry!.length).toBe(1);

      const entry = state.toolTelemetry![0];
      expect(entry.toolId).toBe('echo_tool');
      expect(entry.lifecycleState).toBe('COMPLETED');
      expect(entry.requestId).toBe(requestId);
      expect(entry.executionOwner).toBe(userId);
      expect(entry.inputHash).toBeDefined();
      expect(entry.outputHash).toBeDefined();
      expect(entry.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });
});
