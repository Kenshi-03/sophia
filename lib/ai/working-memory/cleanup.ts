import { getRedisClient } from '../../redis';
import { logger } from '../../logger';
import { WorkingMemory } from './store';
import { WorkingMemoryState } from './types';

/**
 * Scans the active execution sorted set and cleans up any executions that have expired or hung.
 * Returns the number of successfully cleaned/recovered executions.
 */
export async function cleanupStaleExecutions(): Promise<number> {
  const redis = getRedisClient();
  const activeSetKey = 'v1:system:active-executions';
  const now = Date.now();
  let cleanedCount = 0;

  try {
    // 1. Find all keys whose expiration epoch is <= now
    const staleKeys = await redis.zrangebyscore(activeSetKey, '-inf', now);
    
    if (staleKeys.length === 0) {
      return 0;
    }

    logger.info(`Stale Execution Worker: Found ${staleKeys.length} potential orphaned executions to recover.`, {
      keys: staleKeys
    });

    for (const key of staleKeys) {
      try {
        // Retrieve state
        const dataStr = await redis.get(key);
        if (!dataStr) {
          // Main key has already expired or been deleted. Remove it from the sorted set index.
          await redis.zrem(activeSetKey, key);
          continue;
        }

        const state = JSON.parse(dataStr) as WorkingMemoryState;
        const wm = WorkingMemory.fromState(state);
        
        // Update stage to FAILED & set cleanupReason to timeout
        await wm.updateState((s) => {
          s.currentStage = 'FAILED';
          s.lifecycleStatus = 'completed';
          s.cleanupReason = 'stale_timeout';
        });

        // Write diagnostics to PostgreSQL (0 latency, 0 token counts for timeout)
        await wm.saveToDb(0, 0, 0);

        // Delete from Redis
        await wm.delete('stale_timeout');

        logger.warn('Successfully recovered and cleaned stale Working Memory execution', {
          executionId: state.executionId,
          userId: state.userId
        });
        
        cleanedCount++;
      } catch (keyErr) {
        logger.error(`Failed to cleanup single stale execution key: ${key}`, keyErr);
        // Ensure we remove it from sorted set if it is blocking
        await redis.zrem(activeSetKey, key).catch(() => {});
      }
    }
  } catch (err) {
    logger.error('Failed to run cleanupStaleExecutions worker task', err);
  }

  return cleanedCount;
}
