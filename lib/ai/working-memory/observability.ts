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

import { AssembledReasoningContext } from './types';

/**
 * Logs human-readable cognition logs in dev mode
 */
export function logDevCognitionObservability(
  stage: string,
  data: {
    candidatesBefore?: any[];
    candidatesAfter?: any[];
    pruningResult?: any;
    assembledContext?: AssembledReasoningContext;
  }
): void {
  if (process.env.NODE_ENV !== 'development' || process.env.DEV_COGNITION_MODE !== 'true') {
    return;
  }

  console.log(`\n================== DEV COGNITION OBSERVABILITY [${stage}] ==================`);
  const devUserId = process.env.DEV_USER_ID || 'cmpmrvs6q0000u3jw6rvj83jg';
  console.log(`[DevCognitionMode] Identity:`, JSON.stringify({
    devMode: true,
    activeDevUserId: devUserId,
    activeDevEmail: "user@sophia.local"
  }));

  if (data.candidatesBefore) {
    console.log(`[Retrieval] Retrieved ${data.candidatesBefore.length} raw candidates:`);
    data.candidatesBefore.forEach((c, idx) => {
      const relevance = c.relevanceScore !== undefined ? c.relevanceScore : "N/A";
      const decayedImp = c.decayedImportance !== undefined ? c.decayedImportance.toFixed(3) : "N/A";
      console.log(`  Candidate [${idx + 1}] ID: ${c.id}`);
      console.log(`    Category: ${c.category} | Source: ${c.sourceType} | Taxonomy: ${c.taxonomy}`);
      console.log(`    Score Breakdown -> Relevance: ${relevance} | Decayed Importance: ${decayedImp} | Combined: ${c.combinedScore?.toFixed(3)}`);
      console.log(`    Content: "${c.content.substring(0, 120)}${c.content.length > 120 ? '...' : ''}"`);
    });
  }

  if (data.pruningResult) {
    const pr = data.pruningResult;
    console.log(`\n[Pruning & Diversity]`);
    console.log(`  Budget pressure level: ${pr.budgetPressureLevel}`);
    console.log(`  Initial candidate count: ${pr.candidateCountBefore} | Final: ${pr.candidateCountAfter}`);
    console.log(`  Pruned: ${pr.pruningCount} candidates | Saved tokens: ${pr.savedTokens}`);
    console.log(`  Overflow triggered: ${pr.overflowTriggered ? "⚠️ Yes" : "✓ No"} | Emergency pruning: ${pr.emergencyPruningTriggered ? "⚠️ Yes" : "✓ No"}`);
    if (pr.protectedAnchorIds && pr.protectedAnchorIds.length > 0) {
      console.log(`  Protected anchors (${pr.protectedAnchorIds.length}): ${JSON.stringify(pr.protectedAnchorIds)}`);
    }
  }

  if (data.assembledContext) {
    const ac = data.assembledContext;
    console.log(`\n[Context Assembly]`);
    console.log(`  Final context token count: ${ac.metadata.totalTokens} / Budget: ${ac.metadata.finalResolvedTokenCount || ac.metadata.totalTokens}`);
    console.log(`  Tokens per layer:`, ac.metadata.tokensPerLayer);
    console.log(`  Validation passed: ${ac.metadata.validationPassed ? "✓ Yes" : "❌ No"}`);
    if (ac.metadata.overflowDetected) {
      console.log(`  ⚠️ Overflow detected by: ${ac.metadata.overflowTokens} tokens!`);
    }
    if (ac.metadata.truncatedCandidateIds && ac.metadata.truncatedCandidateIds.length > 0) {
      console.log(`  ⚠️ Truncated candidate IDs:`, ac.metadata.truncatedCandidateIds);
      console.log(`  Truncation reason: ${ac.metadata.truncatedReason}`);
    }
    console.log(`\n[Ordering Rationale]`);
    ac.metadata.orderingRationale?.forEach((rat: string) => {
      console.log(`  - ${rat}`);
    });
  }
  console.log(`=========================================================================\n`);
}
