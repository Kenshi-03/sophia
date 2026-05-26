import { RetrievalCandidate, RetrievalSourceType } from "./types";

export const SCORING_CONSTANTS = {
  SEMANTIC_WEIGHT: 0.4,
  TEMPORAL_WEIGHT: 0.2,
  CONTINUITY_WEIGHT: 0.2,
  CONFIDENCE_WEIGHT: 0.2,
  
  // Explicit source prioritization multipliers
  SOURCE_MULTIPLIERS: {
    active_session_context: 1.35,
    user_profile: 1.30,
    relationship_link: 1.20,
    calendar_event: 1.10,
    semantic_memory: 1.00,
    episodic_memory: 1.00,
    synthetic_context: 0.95,
    google_calendar_event: 1.10,
    task: 1.00,
    relationship_link_synthetic: 1.20 // fallback for relational mapping
  } as Record<string, number>,

  // Explicit static reliability multipliers per sourceType
  RELIABILITY_MULTIPLIERS: {
    user_profile: 1.00,
    active_session_context: 1.00,
    relationship_link: 0.95,
    calendar_event: 0.90,
    google_calendar_event: 0.90,
    semantic_memory: 0.90,
    episodic_memory: 0.85,
    synthetic_context: 0.75,
    task: 0.80
  } as Record<string, number>
} as const;

export class ContextScoringEngine {
  /**
   * Deterministically scores a single RetrievalCandidate.
   * Returns a shallow copy containing the updated combinedScore and a detailed scoreBreakdown.
   */
  public static scoreCandidate(
    candidate: RetrievalCandidate,
    options?: {
      sessionId?: string;
      activeTopic?: string;
      currentStage?: string;
    }
  ): RetrievalCandidate {
    // 1. Semantic Relevance Score (40% Weight)
    // relevanceScore is between 0 and 100, normalize it to 0.0 - 1.0
    const rawSemantic = Math.max(0, Math.min(100, candidate.relevanceScore));
    const semanticScore = Number((rawSemantic / 100).toFixed(4));

    // 2. Temporal Weight (20% Weight)
    // decayedImportance is already temporal recency weight (0.0 to 1.0)
    const temporalWeight = Math.max(0, Math.min(1.0, candidate.decayedImportance));

    // 3. Continuity Weight (20% Weight)
    let continuityWeight = 0.0;
    let continuityReason = "none";

    const isSessionMatch = 
      candidate.sourceType === "active_session_context" || 
      (options?.sessionId && candidate.id.includes(options.sessionId));

    if (isSessionMatch) {
      continuityWeight = 1.0;
      continuityReason = "active_session_match";
    } else if (options?.activeTopic && candidate.category.toLowerCase() === options.activeTopic.toLowerCase()) {
      continuityWeight = 0.7;
      continuityReason = "category_match";
    } else if (options?.currentStage && candidate.taxonomy.toLowerCase() === options.currentStage.toLowerCase()) {
      continuityWeight = 0.5;
      continuityReason = "fsm_stage_match";
    } else if (candidate.taxonomy === "planning" || candidate.taxonomy === "insight") {
      // General focus continuity boost
      continuityWeight = 0.3;
      continuityReason = "recent_context_match";
    }

    // 4. Confidence Score (20% Weight)
    // Calculate based on relevanceScore normalized * source reliability multiplier
    const reliabilityLookup = SCORING_CONSTANTS.RELIABILITY_MULTIPLIERS[candidate.sourceType] ?? 1.0;
    const confidenceScore = Number((semanticScore * reliabilityLookup).toFixed(4));

    // 5. Combined Score calculation before multiplier
    const combinedScoreBeforeMultiplier = Number(
      (
        semanticScore * SCORING_CONSTANTS.SEMANTIC_WEIGHT +
        temporalWeight * SCORING_CONSTANTS.TEMPORAL_WEIGHT +
        continuityWeight * SCORING_CONSTANTS.CONTINUITY_WEIGHT +
        confidenceScore * SCORING_CONSTANTS.CONFIDENCE_WEIGHT
      ).toFixed(4)
    );

    // 6. Source prioritization multiplier application
    const sourceMultiplier = SCORING_CONSTANTS.SOURCE_MULTIPLIERS[candidate.sourceType] ?? 1.0;
    const finalCombinedScore = Number((combinedScoreBeforeMultiplier * sourceMultiplier).toFixed(4));

    return {
      ...candidate,
      combinedScore: finalCombinedScore,
      scoreBreakdown: {
        semanticScore,
        temporalWeight,
        continuityWeight,
        confidenceScore,
        sourceMultiplier,
        combinedScoreBeforeMultiplier,
        finalCombinedScore,
        continuityReason
      }
    };
  }

  /**
   * Scores an array of RetrievalCandidate objects deterministically.
   */
  public static scoreCandidates(
    candidates: RetrievalCandidate[],
    options?: {
      sessionId?: string;
      activeTopic?: string;
      currentStage?: string;
    }
  ): RetrievalCandidate[] {
    return candidates.map(c => this.scoreCandidate(c, options));
  }
}
