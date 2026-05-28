import { getRedisClient } from '../../redis';
import prisma from '../../db/prisma';
import crypto from 'crypto';
import { logger } from '../../logger';
import {
  WorkingMemoryStage,
  WorkingMemoryState,
  LifecycleStatus,
  ExecutionPriority,
  ALLOWED_TRANSITIONS,
  WORKING_MEMORY_LIMITS
} from './types';
import { TransitionRegistry, StateGuards } from '../orchestration/executive-fsm';

// Lua script for atomic versioned write
const LUA_VERSIONED_WRITE = `
local key = KEYS[1]
local activeSetKey = KEYS[2]
local stateStr = ARGV[1]
local ttl = tonumber(ARGV[2])
local expectedVersion = tonumber(ARGV[3])
local expiresAt = tonumber(ARGV[4])

local current = redis.call('get', key)
if not current then
  if expectedVersion ~= 0 then
    return 0 -- Key expired or did not exist when we expected it
  end
  redis.call('set', key, stateStr, 'EX', ttl)
  redis.call('zadd', activeSetKey, expiresAt, key)
  return 1
else
  local currObj = cjson.decode(current)
  if currObj.version ~= expectedVersion then
    return 0 -- Version mismatch (Optimistic lock conflict)
  end
  redis.call('set', key, stateStr, 'EX', ttl)
  redis.call('zadd', activeSetKey, expiresAt, key)
  return 1
end
`;

export class WorkingMemory {
  private state: WorkingMemoryState;
  private redis = getRedisClient();
  private key: string;
  private activeSetKey = 'v1:system:active-executions';

  constructor(
    userId: string,
    sessionId: string,
    userInput: string,
    options?: {
      executionId?: string;
      tokenBudget?: number;
      priority?: ExecutionPriority;
      executionSource?: string;
    }
  ) {
    const execId = options?.executionId || `wm_exec_${crypto.randomUUID()}`;
    const budget = options?.tokenBudget || WORKING_MEMORY_LIMITS.MAX_CONTEXT_TOKENS;
    this.key = `v1:user:${userId}:working-memory:${execId}`;

    const now = new Date().toISOString();
    const expiry = Date.now() + WORKING_MEMORY_LIMITS.TTL_SECONDS * 1000;

    this.state = {
      schemaVersion: 1,
      version: 1,
      executionId: execId,
      userId,
      sessionId,
      currentStage: 'IDLE',
      currentUserInput: userInput,
      tokenBudget: budget,
      currentTokenCount: Math.ceil(userInput.length / 4), // local character-based approximation
      lifecycleStatus: 'active',
      priority: options?.priority || 'normal',
      cleanupReason: 'none',
      executionSource: options?.executionSource || 'chat_api',
      createdAt: now,
      updatedAt: now,
      expiresAt: expiry,
      retrievalStaging: {
        rawCandidates: [],
        semanticCandidates: [],
        temporalCandidates: [],
        relationshipCandidates: [],
        metadata: {
          budgetAllocation: { memories: 0.5, relations: 0.3, profile: 0.2 },
          totalRetrievedCount: 0,
        },
        traceability: {
          filtersApplied: [],
          discardedIds: [],
          selectionPath: [],
        },
      },
      reasoningState: {
        scratchpad: '',
        draftResponse: '',
        temporaryCognitionState: {},
      },
      reflectionPrep: {
        retryTracker: {
          retrieval_retry: 0,
          reflection_retry: 0,
          gateway_retry: 0,
          orchestration_retry: 0,
        },
        approvalRequired: false,
        approvalGranted: false,
        confidenceScore: 1.0,
        feedbackBuffer: [],
      },
    };
  }

  /**
   * Instantiates a WorkingMemory object directly from a raw state object
   */
  public static fromState(state: WorkingMemoryState): WorkingMemory {
    const wm = new WorkingMemory(state.userId, state.sessionId, state.currentUserInput, {
      executionId: state.executionId,
      tokenBudget: state.tokenBudget,
      priority: state.priority,
      executionSource: state.executionSource
    });
    wm.state = state;
    return wm;
  }

  /**
   * Loads a WorkingMemory instance from Redis
   */
  public static async load(userId: string, executionId: string): Promise<WorkingMemory | null> {
    const redis = getRedisClient();
    const key = `v1:user:${userId}:working-memory:${executionId}`;
    const dataStr = await redis.get(key);
    if (!dataStr) {
      logger.warn('Failed to load WorkingMemory: key not found', { key });
      return null;
    }

    try {
      const state = JSON.parse(dataStr) as WorkingMemoryState;
      
      // Ownership check: strict cross-user security boundary validation
      if (state.userId !== userId) {
        logger.error('Security alert: unauthorized access attempt to WorkingMemory', {
          requestedUserId: userId,
          ownerUserId: state.userId,
          executionId
        });
        throw new Error('Access denied to this execution workspace.');
      }

      return WorkingMemory.fromState(state);
    } catch (err) {
      logger.error('Failed to parse WorkingMemory state from Redis', err);
      return null;
    }
  }

  public getState(): WorkingMemoryState {
    return this.state;
  }

  /**
   * Saves the current memory state to Redis atomically via Lua.
   * If expectedVersion is specified, verifies it before saving.
   */
  public async save(expectedVersion = 0): Promise<boolean> {
    try {
      const stateStr = JSON.stringify(this.state);
      
      // Payload size safety guard check
      if (stateStr.length > WORKING_MEMORY_LIMITS.MAX_PAYLOAD_BYTES) {
        logger.error('Working Memory write rejected: payload exceeds 5MB size limit', {
          executionId: this.state.executionId,
          sizeBytes: stateStr.length
        });
        throw new Error('Working memory payload size limits exceeded.');
      }

      const result = await this.redis.eval(
        LUA_VERSIONED_WRITE,
        2,
        this.key,
        this.activeSetKey,
        stateStr,
        WORKING_MEMORY_LIMITS.TTL_SECONDS,
        expectedVersion,
        this.state.expiresAt
      );

      return result === 1;
    } catch (err) {
      logger.error('Error saving WorkingMemory to Redis via Lua', err);
      return false;
    }
  }

  /**
   * Applies an updates callback function atomically with optimistic version checks and retries
   */
  public async updateState(
    updater: (state: WorkingMemoryState) => void | Promise<void>
  ): Promise<void> {
    let retries = 0;
    const maxRetries = WORKING_MEMORY_LIMITS.MAX_ORCHESTRATION_RETRIES;

    while (retries < maxRetries) {
      const currentVersion = this.state.version;
      const originalStage = this.state.currentStage;
      
      // Work on a deep copy of the state to keep the local mutation separate until saved
      const stateCopy = JSON.parse(JSON.stringify(this.state)) as WorkingMemoryState;
      
      await updater(stateCopy);

      // Enforce FSM state transition rules
      if (stateCopy.currentStage !== originalStage) {
        try {
          TransitionRegistry.validateTransition(originalStage, stateCopy.currentStage);
          StateGuards.verifyStateTransition(stateCopy, originalStage, stateCopy.currentStage);
        } catch (err) {
          logger.error('FSM contract violation during state mutation', {
            executionId: this.state.executionId,
            from: originalStage,
            to: stateCopy.currentStage,
            error: err
          });
          throw err;
        }
      }

      // Enforce token budget checks and emergency pruning triggers
      stateCopy.version = currentVersion + 1;
      stateCopy.updatedAt = new Date().toISOString();

      // Implement Scratchpad limits & truncation policy
      if (stateCopy.reasoningState.scratchpad.length > WORKING_MEMORY_LIMITS.MAX_SCRATCHPAD_TOKENS * 4) {
        logger.warn('Token limit threshold met: truncating scratchpad content', {
          executionId: stateCopy.executionId,
          originalLength: stateCopy.reasoningState.scratchpad.length
        });
        
        // Truncate keeping first 500 chars (system prompts context) + last 12000 chars of CoT
        const scratchpad = stateCopy.reasoningState.scratchpad;
        stateCopy.reasoningState.scratchpad = 
          scratchpad.substring(0, 500) + 
          '\n\n[... Truncated for token safety ...]\n\n' + 
          scratchpad.substring(scratchpad.length - 12000);
      }

      // Set key value
      this.state = stateCopy;

      const success = await this.save(currentVersion);
      if (success) {
        return; // successfully saved atomically!
      }

      // Conflict occurred, increment local retry and reload fresh state from Redis
      retries++;
      this.state.reflectionPrep.retryTracker.orchestration_retry++;
      logger.warn('Optimistic lock conflict detected, reloading Working Memory state and retrying updateState', {
        executionId: this.state.executionId,
        retryAttempt: retries,
        version: currentVersion
      });

      const freshMemory = await WorkingMemory.load(this.state.userId, this.state.executionId);
      if (freshMemory) {
        this.state = freshMemory.getState();
      } else {
        // key has disappeared entirely
        throw new Error('WorkingMemory key expired or deleted during transaction retry.');
      }
    }

    throw new Error(`Orchestration retry limit exceeded (${maxRetries} attempts failed).`);
  }

  /**
   * Explicitly wipes the Working Memory Redis cache key and active-execution index
   */
  public async delete(cleanupReason = 'completed'): Promise<void> {
    try {
      if (cleanupReason === 'failed') {
        this.state.currentStage = 'FAILED';
      } else if (cleanupReason === 'timeout') {
        this.state.currentStage = 'TIMEOUT';
      } else if (cleanupReason === 'cancelled') {
        this.state.currentStage = 'CANCELLED';
      } else {
        this.state.currentStage = 'COMPLETED';
      }
      this.state.lifecycleStatus = 'cleaned';
      this.state.cleanupReason = cleanupReason;

      const pipeline = this.redis.pipeline();
      pipeline.del(this.key);
      pipeline.zrem(this.activeSetKey, this.key);
      await pipeline.exec();

      logger.debug('WorkingMemory cleaned up successfully', {
        executionId: this.state.executionId,
        cleanupReason
      });
    } catch (err) {
      logger.error('Failed to clear WorkingMemory cache', err, { executionId: this.state.executionId });
    }
  }

  /**
   * Writes the final lightweight, explainable diagnostics audit log to PostgreSQL.
   */
  public async saveToDb(
    latencyMs: number,
    promptTokens = 0,
    completionTokens = 0
  ): Promise<void> {
    try {
      const totalTokens = promptTokens + completionTokens;

      // Extract lightweight traceability structure (IDs, scores, categories)
      const selected = this.state.retrievalStaging.rawCandidates.map(c => ({
        id: c.id,
        category: c.category,
        score: Number(c.combinedScore.toFixed(4)),
        source: c.sourceType,
        taxonomy: c.taxonomy,
      }));

      const discarded = this.state.retrievalStaging.traceability.discardedIds;

      // Extract dynamic budgeting metrics and arbitration details from state metadata
      const budgetingMetrics = (this.state.retrievalStaging.metadata as any).budgetingMetrics || null;
      const arbitrationTraces = (this.state.retrievalStaging.metadata as any).arbitrationTraces || null;
      const arbitrationGuardrails = (this.state.retrievalStaging.metadata as any).arbitrationGuardrails || null;

      const retrievalTrace = {
        selected,
        discarded,
        totalRetrievedCount: this.state.retrievalStaging.metadata.totalRetrievedCount,
        budgetingMetrics,
        arbitrationTraces,
        arbitrationGuardrails,
        reflectionBuffer: this.state.reflectionBuffer || null,
        executiveFSM: this.state.executiveFSM || null,
        executionContext: this.state.executionContext || null,
        asyncTelemetry: this.state.asyncTelemetry || null,
        toolTelemetry: this.state.toolTelemetry || null
      };

      const finalConfidenceScore = this.state.reflectionBuffer
        ? this.state.reflectionBuffer.confidenceScore
        : this.state.reflectionPrep.confidenceScore;

      const finalReflectionStatus = this.state.reflectionBuffer
        ? (this.state.reflectionBuffer.contradictionFlags.possibleContradiction ? 'failed' : 'success')
        : (this.state.reflectionPrep.feedbackBuffer.length > 0 ? 'corrected' : 'none');

      await prisma.workingMemoryLog.create({
        data: {
          executionId: this.state.executionId,
          userId: this.state.userId,
          sessionId: this.state.sessionId,
          finalStage: this.state.currentStage,
          userInputLength: this.state.currentUserInput.length,
          tokenBudget: this.state.tokenBudget,
          promptTokens,
          completionTokens,
          totalTokens: totalTokens > 0 ? totalTokens : this.state.currentTokenCount,
          latencyMs,
          retrievalRetryCount: this.state.reflectionPrep.retryTracker.retrieval_retry,
          reflectionRetryCount: this.state.reflectionPrep.retryTracker.reflection_retry,
          gatewayRetryCount: this.state.reflectionPrep.retryTracker.gateway_retry,
          orchestrationRetryCount: this.state.reflectionPrep.retryTracker.orchestration_retry,
          confidenceScore: finalConfidenceScore,
          reflectionStatus: finalReflectionStatus,
          retrievalTrace: retrievalTrace as any,
          executionSource: this.state.executionSource,
          cleanupReason: this.state.cleanupReason !== 'none' ? this.state.cleanupReason : 'completed',
        }
      });

      logger.info('Saved WorkingMemory Log to DB successfully', {
        executionId: this.state.executionId,
        latencyMs,
        totalTokens
      });
    } catch (err) {
      logger.error('Failed to write WorkingMemory diagnostics log to database', err, {
        executionId: this.state.executionId
      });
    }
  }
}
export function estimateTokensFromChars(charCount: number): number {
  return Math.ceil(charCount / 4);
}
