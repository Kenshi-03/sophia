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
  | 'task'
  | 'user_profile'
  | 'relationship_link';

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
}

export interface RetrievalStagingArea {
  rawCandidates: RetrievalCandidate[];
  semanticCandidates: RetrievalCandidate[];
  temporalCandidates: any[]; // Google Calendar events, tasks, etc.
  relationshipCandidates: any[]; // Semantic graph relations
  metadata: {
    budgetAllocation: Record<string, number>;
    totalRetrievedCount: number;
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
