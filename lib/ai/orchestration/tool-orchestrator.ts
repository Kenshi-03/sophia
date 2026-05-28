import { z } from 'zod';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import {
  ExecutiveLifecycleState,
  ToolLifecycleState,
  ToolExecutionContract,
  ToolExecutionTelemetry,
  WorkingMemoryState,
  FailurePattern
} from '@/lib/ai/working-memory/types';
import { WorkingMemory } from '@/lib/ai/working-memory/store';
import {
  AsyncScheduler,
  AsyncTaskRunner,
  CancellationManager,
  TimeoutManager
} from './async-runtime';
import { RecoveryCoordinator } from './recovery-coordinator';

// Import wrapped capabilities
import { retrieveRelevantMemories } from '@/lib/ai/memory/retrieve-memory';
import { getUserSchedule } from '@/lib/db/queries/schedule';
import { RetrievalArbitrationHooks } from '@/lib/ai/working-memory/arbitration';
import { generateAiResponse } from './response-generator';
import { ReflectionBuffer } from '@/lib/ai/working-memory/reflection-buffer';

export interface ToolDefinition<I extends z.ZodTypeAny = z.ZodTypeAny, O extends z.ZodTypeAny = z.ZodTypeAny> {
  contract: ToolExecutionContract<I, O>;
  execute: (input: z.infer<I>, signal: AbortSignal, options?: any) => Promise<z.infer<O>>;
}

/**
 * Static, startup-registered, immutable Tool Registry.
 */
export class ToolRegistry {
  private static registeredTools = new Map<string, ToolDefinition>();
  private static isFrozen = false;

  public static register(tool: ToolDefinition) {
    if (this.isFrozen) {
      throw new Error("ToolRegistry is frozen. Registry mutations are not allowed during runtime execution.");
    }
    if (this.registeredTools.has(tool.contract.toolId)) {
      throw new Error(`Tool with ID ${tool.contract.toolId} is already registered.`);
    }
    this.registeredTools.set(tool.contract.toolId, tool);
  }

  public static getTool(toolId: string): ToolDefinition | undefined {
    return this.registeredTools.get(toolId);
  }

  public static freeze() {
    this.isFrozen = true;
    logger.info("ToolRegistry frozen. Definitions, execution contracts, and permissions are now immutable.");
  }

  public static isRegistryFrozen(): boolean {
    return this.isFrozen;
  }

  public static clearRegistryForTest() {
    this.isFrozen = false;
    this.registeredTools.clear();
  }
}

/**
 * Zod schemas and metadata for the 6 core tools.
 */
export const memorySearchTool: ToolDefinition = {
  contract: {
    toolId: 'memory_search',
    toolName: 'Memory Search Tool',
    toolVersion: '1.0.0',
    criticality: 'CRITICAL',
    inputSchema: z.object({
      userId: z.string(),
      query: z.string()
    }),
    outputSchema: z.array(z.any()),
    timeoutMs: 10000,
    maxRetries: 1,
    degradationAllowed: false,
    failureSeverity: 'critical',
    failurePatterns: [{ match: 'timeout', classification: 'TIMEOUT_FAILURE', retryPolicy: 'SAFE_ONCE' }] as FailurePattern[],
    permissionScopes: {
      allowedStages: ['RETRIEVAL']
    },
    resourceLimits: {
      maxPayloadBytes: 1024 * 1024 // 1MB
    }
  },
  execute: async (input: any) => {
    return retrieveRelevantMemories(input.userId, input.query);
  }
};

export const scheduleLookupTool: ToolDefinition = {
  contract: {
    toolId: 'schedule_lookup',
    toolName: 'Schedule Lookup Tool',
    toolVersion: '1.0.0',
    criticality: 'OPTIONAL',
    inputSchema: z.object({
      userId: z.string()
    }),
    outputSchema: z.array(z.any()),
    timeoutMs: 5000,
    maxRetries: 0,
    degradationAllowed: true,
    failureSeverity: 'low',
    failurePatterns: [{ match: 'timeout', classification: 'TIMEOUT_FAILURE', retryPolicy: 'NONE' }] as FailurePattern[],
    permissionScopes: {
      allowedStages: ['RETRIEVAL']
    },
    resourceLimits: {
      maxPayloadBytes: 512 * 1024 // 512KB
    }
  },
  execute: async (input: any) => {
    return getUserSchedule(input.userId);
  }
};

export const arbitrationEngineTool: ToolDefinition = {
  contract: {
    toolId: 'arbitration_engine',
    toolName: 'Retrieval Arbitration Engine',
    toolVersion: '1.0.0',
    criticality: 'CRITICAL',
    inputSchema: z.object({
      relevantMemories: z.array(z.any()),
      options: z.object({
        sessionId: z.string(),
        currentStage: z.string(),
        query: z.string(),
        activeRoadmapPhase: z.string().optional(),
        activeSprint: z.string().optional(),
        activeContinuityCluster: z.string().optional()
      })
    }),
    outputSchema: z.object({
      candidates: z.array(z.any()),
      traces: z.array(z.any()),
      guardrails: z.any()
    }),
    timeoutMs: 5000,
    maxRetries: 0,
    degradationAllowed: false,
    failureSeverity: 'critical',
    failurePatterns: [] as FailurePattern[],
    permissionScopes: {
      allowedStages: ['ARBITRATION']
    },
    resourceLimits: {
      maxPayloadBytes: 2 * 1024 * 1024 // 2MB
    }
  },
  execute: async (input: any) => {
    return RetrievalArbitrationHooks.arbitrate(input.relevantMemories, input.options);
  }
};

export const responseGenerationTool: ToolDefinition = {
  contract: {
    toolId: 'response_generation',
    toolName: 'AI Response Synthesis Generator',
    toolVersion: '1.0.0',
    criticality: 'CRITICAL',
    inputSchema: z.object({
      query: z.string(),
      context: z.string(),
      options: z.object({
        model: z.string().optional(),
        aiMode: z.any().optional(),
        customApiKey: z.string().nullable().optional()
      }).optional()
    }),
    outputSchema: z.string(),
    timeoutMs: 25000,
    maxRetries: 1,
    degradationAllowed: false,
    failureSeverity: 'critical',
    failurePatterns: [{ match: 'timeout', classification: 'TIMEOUT_FAILURE', retryPolicy: 'SAFE_ONCE' }] as FailurePattern[],
    permissionScopes: {
      allowedStages: ['GENERATION']
    },
    resourceLimits: {
      maxPayloadBytes: 4 * 1024 * 1024 // 4MB
    }
  },
  execute: async (input: any) => {
    return generateAiResponse(input.query, input.context, input.options);
  }
};

export const reflectionVerifyTool: ToolDefinition = {
  contract: {
    toolId: 'reflection_verify',
    toolName: 'Reflection Verification Buffer',
    toolVersion: '1.0.0',
    criticality: 'CRITICAL',
    inputSchema: z.object({
      query: z.string(),
      response: z.string(),
      candidates: z.array(z.any())
    }),
    outputSchema: z.any(),
    timeoutMs: 5000,
    maxRetries: 0,
    degradationAllowed: false,
    failureSeverity: 'critical',
    failurePatterns: [] as FailurePattern[],
    permissionScopes: {
      allowedStages: ['REFLECTION']
    },
    resourceLimits: {
      maxPayloadBytes: 2 * 1024 * 1024 // 2MB
    }
  },
  execute: async (input: any) => {
    return ReflectionBuffer.verify(input.query, input.response, input.candidates);
  }
};

export const postgresPersistTool: ToolDefinition = {
  contract: {
    toolId: 'postgres_persist',
    toolName: 'PostgreSQL Telemetry Persistence Logger',
    toolVersion: '1.0.0',
    criticality: 'CRITICAL',
    inputSchema: z.object({
      latencyMs: z.number(),
      promptTokens: z.number().optional(),
      completionTokens: z.number().optional()
    }),
    outputSchema: z.any(),
    timeoutMs: 5000,
    maxRetries: 0,
    degradationAllowed: true,
    failureSeverity: 'low',
    failurePatterns: [] as FailurePattern[],
    permissionScopes: {
      allowedStages: ['PERSISTENCE']
    },
    resourceLimits: {
      maxPayloadBytes: 256 * 1024 // 256KB
    }
  },
  execute: async (input: any, signal: AbortSignal, options?: any) => {
    if (!options?.wm) {
      throw new Error("Execution Boundary Violation: postgres_persist tool requires WorkingMemory instance in options.");
    }
    return await options.wm.saveToDb(input.latencyMs, input.promptTokens || 0, input.completionTokens || 0);
  }
};

// Register default tools
ToolRegistry.register(memorySearchTool);
ToolRegistry.register(scheduleLookupTool);
ToolRegistry.register(arbitrationEngineTool);
ToolRegistry.register(responseGenerationTool);
ToolRegistry.register(reflectionVerifyTool);
ToolRegistry.register(postgresPersistTool);
ToolRegistry.freeze();

/**
 * Route validation for tool execution.
 */
export class ToolRouter {
  public static route(
    toolId: string,
    currentStage: ExecutiveLifecycleState,
    activeIntent: string | null
  ): ToolDefinition {
    const tool = ToolRegistry.getTool(toolId);
    if (!tool) {
      throw new Error(`Routing Failure: Tool ${toolId} not found in ToolRegistry.`);
    }

    const { contract } = tool;

    // Validate stage permission
    if (!contract.permissionScopes.allowedStages.includes(currentStage)) {
      throw new Error(`Security Exception: Tool ${toolId} execution not allowed in FSM stage ${currentStage}. Allowed stages: ${contract.permissionScopes.allowedStages.join(', ')}`);
    }

    // Validate intent permission if specified
    if (contract.permissionScopes.allowedIntents && activeIntent) {
      if (!contract.permissionScopes.allowedIntents.includes(activeIntent)) {
        throw new Error(`Security Exception: Tool ${toolId} execution not allowed for intent ${activeIntent}. Allowed intents: ${contract.permissionScopes.allowedIntents.join(', ')}`);
      }
    }

    return tool;
  }
}

/**
 * Strictly verifies schema constraints for input and output contracts.
 */
export class ToolVerificationLayer {
  public static validateInput<I extends z.ZodTypeAny>(contract: ToolExecutionContract<I, any>, input: any): z.infer<I> {
    const parseResult = contract.inputSchema.safeParse(input);
    if (!parseResult.success) {
      throw new Error(`Contract Violation: Invalid input for tool ${contract.toolId}. Errors: ${JSON.stringify(parseResult.error.format())}`);
    }
    return parseResult.data;
  }

  public static validateOutput<O extends z.ZodTypeAny>(contract: ToolExecutionContract<any, O>, output: any): z.infer<O> {
    const parseResult = contract.outputSchema.safeParse(output);
    if (!parseResult.success) {
      throw new Error(`Contract Violation: Invalid output for tool ${contract.toolId}. Errors: ${JSON.stringify(parseResult.error.format())}`);
    }
    return parseResult.data;
  }
}

/**
 * Coordinates bounded task execution, timeouts, cancellation scopes, and telemetry reporting.
 */
export class ToolExecutionManager {
  private wm: WorkingMemory;
  private requestId: string;
  private userId: string;
  private activeIntent: string | null;

  constructor(wm: WorkingMemory, activeIntent: string | null = null) {
    this.wm = wm;
    this.requestId = wm.getState().executionId;
    this.userId = wm.getState().userId;
    this.activeIntent = activeIntent;
  }

  public async execute<I = any, O = any>(
    toolId: string,
    input: I,
    options?: {
      isCriticalOverride?: boolean;
      [key: string]: any;
    }
  ): Promise<O> {
    // 0. Ensure Cancellation Scope exists synchronously to avoid race conditions
    CancellationManager.createScope(this.requestId);

    const state = this.wm.getState();
    const currentStage = state.currentStage;
    const startTimeStr = new Date().toISOString();
    const startTimeMs = Date.now();

    // 1. Tool Routing
    let tool: ToolDefinition;
    try {
      tool = ToolRouter.route(toolId, currentStage, this.activeIntent);
    } catch (err: any) {
      logger.error('Tool routing failure', { toolId, stage: currentStage, error: err.message });
      
      // Update WorkingMemory state with rejected routing telemetry
      await this.wm.updateState((s) => {
        if (!s.toolTelemetry) s.toolTelemetry = [];
        s.toolTelemetry.push({
          toolId,
          toolName: toolId,
          toolVersion: '0.0.0',
          requestId: this.requestId,
          executionOwner: this.userId,
          lifecycleState: 'FAILED',
          input,
          retryCount: 0,
          budgetUsage: { latencyMs: 0 },
          routingReasonCode: 'ROUTE_REJECTED',
          routingReasonDetail: err.message,
          inputHash: crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex'),
          error: err.message,
          startedAt: startTimeStr,
          completedAt: new Date().toISOString()
        });
      });
      throw err;
    }

    const { contract } = tool;
    const isCritical = options?.isCriticalOverride !== undefined
      ? options.isCriticalOverride
      : (contract.criticality === 'CRITICAL' || contract.criticality === 'IMPORTANT');

    const updateTelemetry = async (updater: (entry: ToolExecutionTelemetry) => void) => {
      await this.wm.updateState((s) => {
        if (!s.toolTelemetry) s.toolTelemetry = [];
        const idx = s.toolTelemetry.findIndex(
          t => t.toolId === toolId && t.startedAt === startTimeStr
        );
        if (idx >= 0) {
          updater(s.toolTelemetry[idx]);
        } else {
          const entry: ToolExecutionTelemetry = {
            toolId,
            toolName: contract.toolName,
            toolVersion: contract.toolVersion,
            requestId: this.requestId,
            executionOwner: this.userId,
            lifecycleState: 'REGISTERED',
            input,
            retryCount: 0,
            budgetUsage: { latencyMs: 0 },
            routingReasonCode: 'FSM_STAGE_MATCH',
            routingReasonDetail: `Routed for stage ${currentStage}`,
            inputHash: crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex'),
            startedAt: startTimeStr
          };
          updater(entry);
          s.toolTelemetry.push(entry);
        }
      });
    };

    await updateTelemetry(e => {
      e.lifecycleState = 'ROUTED';
    });

    // 2. Input Validation
    let validatedInput: any;
    try {
      validatedInput = ToolVerificationLayer.validateInput(contract, input);
      await updateTelemetry(e => {
        e.lifecycleState = 'VALIDATED';
      });
    } catch (err: any) {
      logger.error('Tool input contract validation failure', { toolId, error: err.message });
      await updateTelemetry(e => {
        e.lifecycleState = 'FAILED';
        e.error = err.message;
        e.completedAt = new Date().toISOString();
      });
      throw err;
    }

    let retryCount = 0;
    const coordinator = new RecoveryCoordinator(this.wm);

    while (true) {
      // 3. Execution via AsyncScheduler
      await updateTelemetry(e => {
        e.lifecycleState = 'EXECUTING';
        e.startedAt = startTimeStr;
        e.retryCount = retryCount;
      });

      const signal = CancellationManager.createScope(this.requestId);

      let isTimedOut = false;
      const taskTimeoutMs = contract.timeoutMs || 10000;
      TimeoutManager.registerTimeout(this.requestId, taskTimeoutMs, () => {
        isTimedOut = true;
        CancellationManager.cancelScope(this.requestId, `Tool ${toolId} execution timeout triggered after ${taskTimeoutMs}ms`);
      });

      const taskRunner = new AsyncTaskRunner({
        taskId: `tool_${toolId}_${startTimeMs}_attempt_${retryCount}`,
        taskType: `tool_${toolId}`,
        parentRequestId: this.requestId,
        lifecycleState: currentStage,
        isCritical: isCritical,
        timeoutMs: taskTimeoutMs,
        execute: async (taskSignal) => {
          // Enforce payload size limit
          const payloadStr = JSON.stringify(validatedInput);
          if (contract.resourceLimits.maxPayloadBytes && payloadStr.length > contract.resourceLimits.maxPayloadBytes) {
            throw new Error(`Resource Limit Exceeded: Input payload size (${payloadStr.length} bytes) exceeds limit of ${contract.resourceLimits.maxPayloadBytes} bytes.`);
          }
          
          return await tool.execute(validatedInput, taskSignal, options);
        }
      });

      try {
        const output = await AsyncScheduler.schedule(taskRunner, signal);

        // Enforce response size limits if defined
        const outputStr = JSON.stringify(output);
        if (contract.resourceLimits.maxPayloadBytes && outputStr.length > contract.resourceLimits.maxPayloadBytes) {
          throw new Error(`Resource Limit Exceeded: Output payload size (${outputStr.length} bytes) exceeds limit of ${contract.resourceLimits.maxPayloadBytes} bytes.`);
        }

        // 4. Output Verification
        const validatedOutput = ToolVerificationLayer.validateOutput(contract, output);

        const endTimeMs = Date.now();
        const latencyMs = endTimeMs - startTimeMs;

        // Deterministic resource cleanup
        TimeoutManager.clearScopeTimers(this.requestId);

        await updateTelemetry(e => {
          e.lifecycleState = 'COMPLETED';
          e.output = validatedOutput;
          e.completedAt = new Date().toISOString();
          e.latencyMs = latencyMs;
          e.outputHash = crypto.createHash('sha256').update(outputStr).digest('hex');
          e.budgetUsage = {
            latencyMs,
            payloadSize: outputStr.length
          };
        });

        return validatedOutput as O;

      } catch (err: any) {
        const endTimeMs = Date.now();
        const latencyMs = endTimeMs - startTimeMs;

        let finalState: ToolLifecycleState = 'FAILED';
        if (signal.aborted) {
          finalState = isTimedOut ? 'TIMEOUT' : 'CANCELLED';
        }

        // Deterministic resource cleanup
        TimeoutManager.clearScopeTimers(this.requestId);

        await updateTelemetry(e => {
          e.lifecycleState = finalState;
          e.error = err.message || String(err);
          e.completedAt = new Date().toISOString();
          e.latencyMs = latencyMs;
          e.budgetUsage = { latencyMs, payloadSize: 0 };
        });

        // 5. Recovery Coordination
        const recoveryResult = await coordinator.handleToolFailure(toolId, contract, err, retryCount);

        if (recoveryResult.action === 'retry') {
          retryCount++;
          if (recoveryResult.retryDelayMs) {
            await new Promise(resolve => setTimeout(resolve, recoveryResult.retryDelayMs));
          }
          continue;
        } else if (recoveryResult.action === 'degrade') {
          await updateTelemetry(e => {
            e.lifecycleState = 'DEGRADED';
          });
          return null as any;
        } else {
          throw err;
        }
      }
    }
  }
}
