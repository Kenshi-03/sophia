import { logger } from '../../logger';
import { WorkingMemory } from './store';
import { getRedisClient } from '../../redis';

/**
 * Logs a highly readable diagnostic trace of the active working memory execution
 */
export function traceWorkingMemory(wm: WorkingMemory): void {
  const state = wm.getState();
  
  logger.info('--- WORKING MEMORY COGNITION TRACE ---', {
    executionId: state.executionId,
    userId: state.userId,
    sessionId: state.sessionId,
    stage: state.currentStage,
    priority: state.priority,
    tokens: `${state.currentTokenCount}/${state.tokenBudget}`,
    scratchpadSize: state.reasoningState.scratchpad.length,
    retrievedCount: state.retrievalStaging.rawCandidates.length,
    retries: state.reflectionPrep.retryTracker,
    confidence: state.reflectionPrep.confidenceScore,
  });
}

/**
 * Retrieves the count and metadata of currently active executions from Redis active-execution set
 */
export async function getActiveExecutionsSummary(): Promise<{
  activeCount: number;
  expiredCount: number;
  keys: string[];
}> {
  const redis = getRedisClient();
  const activeSetKey = 'v1:system:active-executions';
  const now = Date.now();

  try {
    // Retrieve all active key paths
    const allKeys = await redis.zrange(activeSetKey, 0, -1);
    
    // Retrieve expired counts
    const expiredKeys = await redis.zrangebyscore(activeSetKey, '-inf', now);

    return {
      activeCount: allKeys.length,
      expiredCount: expiredKeys.length,
      keys: allKeys
    };
  } catch (err) {
    logger.error('Failed to query active executions summary from Redis', err);
    return { activeCount: 0, expiredCount: 0, keys: [] };
  }
}
