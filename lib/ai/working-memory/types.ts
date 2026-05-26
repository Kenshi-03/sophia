export type WorkingMemoryStage =
  | 'initialized'
  | 'retrieval_staging'
  | 'reasoning'
  | 'reflection'
  | 'completed'
  | 'failed'
  | 'cleaned';

export type LifecycleStatus = 'active' | 'stale' | 'completed' | 'cleaned';

export type RetrievalSourceType =
  | 'semantic_memory'
  | 'episodic_memory'
  | 'google_calendar_event'
  | 'calendar_event'
  | 'task'
  | 'user_profile'
  | 'relationship_link'
  | 'active_session_context'
  | 'synthetic_context';

export type ExecutionPriority = 'low' | 'normal' | 'high' | 'critical';

export type ClassificationTier = 'critical' | 'persistent' | 'contextual' | 'transient';

// Transition contract for FSM
export const ALLOWED_TRANSITIONS: Record<WorkingMemoryStage, WorkingMemoryStage[]> = {
  initialized: ['retrieval_staging', 'failed'],
  retrieval_staging: ['reasoning', 'failed'],
  reasoning: ['reflection', 'completed', 'failed'],
  reflection: ['reasoning', 'completed', 'failed'],
  completed: ['cleaned'],
  failed: ['cleaned'],
  cleaned: [] // Terminal state
};

// Token safety & limit configurations
export const WORKING_MEMORY_LIMITS = {
  MAX_CONTEXT_TOKENS: 12000,
  EMERGENCY_PRUNE_THRESHOLD: 10000,
  MAX_SCRATCHPAD_TOKENS: 4000,
  MAX_GATEWAY_RETRIES: 3,
  MAX_REFLECTION_RETRIES: 3,
  MAX_ORCHESTRATION_RETRIES: 3,
  MAX_PAYLOAD_BYTES: 5 * 1024 * 1024, // 5MB payload limit
  MAX_CONCURRENT_EXECUTIONS: 3, // Per user concurrent execution cap
  TTL_SECONDS: 600, // 10 minutes Redis TTL
  STALE_TIMEOUT_MS: 5 * 60 * 1000 // 5 minutes inactivity timeout
} as const;

export interface RetrievalCandidate {
  id: string;
  content: string; // Stored only in Redis (ephemeral)
  category: string;
  sourceType: RetrievalSourceType;
  taxonomy: string;
  relevanceScore: number;
  decayedImportance: number;
  combinedScore: number;
  traceReason: string;
  classificationTier?: ClassificationTier;
  // Future D1.2 compatibility placeholders
  tokenEstimate?: number;
  temporalWeight?: number;
  confidenceScore?: number;
  scoreBreakdown?: {
    semanticScore: number;
    temporalWeight: number;
    continuityWeight: number;
    confidenceScore: number;
    sourceMultiplier: number;
    combinedScoreBeforeMultiplier: number;
    finalCombinedScore: number;
    continuityReason?: string;
  };
}

export interface DiversityMetrics {
  taxonomyDistribution: Record<string, number>;
  sourceDistribution: Record<string, number>;
  temporalInfluence: Record<string, number>;
  diversityActions: string[];
  echoPreventionActions: string[];
  repeatedClusterReductionCount: number;
  freshnessWeightingContribution: Record<string, number>;
  continuityProtectionSkips: string[];
}

export interface AssembledReasoningContext {
  systemLayer: string;
  continuityLayer: string;
  identityLayer: string;
  roadmapLayer: string;
  semanticLayer: string;
  historicalLayer: string;
  auxiliaryLayer: string;
  metadata: {
    totalTokens: number;
    tokensPerLayer: Record<string, number>;
    validationPassed: boolean;
    assemblyDurationMs: number;
    candidateCount: number;
    protectedAnchorIds: string[];
    orderingRationale: string[];
    overflowDetected: boolean;
    overflowTokens: number;
    truncatedCandidateIds: string[];
    truncatedReason: string;
    finalResolvedTokenCount: number;
  };
}

export interface RetrievalStagingArea {
  rawCandidates: RetrievalCandidate[];
  semanticCandidates: RetrievalCandidate[];
  temporalCandidates: any[]; // Google Calendar events, tasks, etc.
  relationshipCandidates: any[]; // Semantic graph relations
  metadata: {
    budgetAllocation: Record<string, number>;
    totalRetrievedCount: number;
    budgetingMetrics?: {
      budgetVersion: string;
      budgetPressureLevel: "low" | "medium" | "high" | "critical";
      overflowTriggered: boolean;
      emergencyPruningTriggered: boolean;
      candidateCountBefore: number;
      candidateCountAfter: number;
      pruningCount: number;
      savedTokens: number;
      finalAcceptedTokenCount: number;
      budgetingDurationMs: number;
      overflowSeverity?: number;
      duplicateCount?: number;
      densityPrunedCount?: number;
      protectedAnchorIds?: string[];
      candidateReductionRate?: number;
    };
    diversityMetrics?: DiversityMetrics;
    assembledContext?: AssembledReasoningContext;
  };
  traceability: {
    filtersApplied: string[];
    discardedIds: string[];
    selectionPath: string[];
  };
}

export interface TemporaryReasoningState {
  scratchpad: string; // Intermediate CoT reasoning
  draftResponse: string; // Current draft response
  temporaryCognitionState: Record<string, any>; // Stage-local variables
}

export interface RetryTracker {
  retrieval_retry: number;
  reflection_retry: number;
  gateway_retry: number;
  orchestration_retry: number;
}

export interface ReflectionPreparation {
  retryTracker: RetryTracker;
  approvalRequired: boolean;
  approvalGranted: boolean;
  confidenceScore: number; // Self-correction confidence metric
  feedbackBuffer: string[]; // Self-reflection output or critiques
}

export interface WorkingMemoryState {
  schemaVersion: number;
  version: number; // Incremented for atomic optimistic locking
  executionId: string;
  userId: string;
  sessionId: string;
  currentStage: WorkingMemoryStage;
  currentUserInput: string;
  tokenBudget: number;
  currentTokenCount: number;
  lifecycleStatus: LifecycleStatus;
  priority: ExecutionPriority;
  cleanupReason: string; // why it was cleaned: completed, failed, stale_timeout, etc.
  executionSource: string; // chat_api, worker_job, etc.
  createdAt: string;
  updatedAt: string;
  expiresAt: number; // Epoch timestamp (ms) for cleanup
  retrievalStaging: RetrievalStagingArea;
  reasoningState: TemporaryReasoningState;
  reflectionPrep: ReflectionPreparation;
}
