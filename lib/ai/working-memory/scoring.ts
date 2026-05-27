import { RetrievalCandidate } from "./types";
import { SourcePriorityResolver, RetrievalUsefulnessScorer, ConfidenceBalancer } from "./arbitration";

export const SCORING_CONSTANTS = {
  SEMANTIC_WEIGHT: 0.30,
  CONTINUITY_WEIGHT: 0.25,
  SOURCE_WEIGHT: 0.20,
  TEMPORAL_WEIGHT: 0.10,
  USEFULNESS_WEIGHT: 0.15
} as const;

export class ContextScoringEngine {
  /**
   * Scores a single RetrievalCandidate using D1.3 Retrieval Arbitration scoring.
   * Returns a copy containing the updated combinedScore and a detailed scoreBreakdown.
   */
  public static scoreCandidate(
    candidate: RetrievalCandidate,
    options?: {
      sessionId?: string;
      activeTopic?: string;
      currentStage?: string;
      sprintTheme?: string;
      phaseTheme?: string;
      protectedAnchorIds?: string[];
    }
  ): RetrievalCandidate {
    const semanticScore = Number((Math.max(0, Math.min(100, candidate.relevanceScore)) / 100).toFixed(4));
    
    let continuityScore = 0.0;
    let continuityReason = "none";
    
    const isSessionMatch = 
      candidate.sourceType === "active_session_context" || 
      (options?.sessionId && candidate.id.includes(options.sessionId));

    if (isSessionMatch) {
      continuityScore = 1.0;
      continuityReason = "active_session_match";
    } else if (options?.activeTopic && candidate.category.toLowerCase() === options.activeTopic.toLowerCase()) {
      continuityScore = 0.7;
      continuityReason = "category_match";
    } else if (options?.currentStage && candidate.taxonomy.toLowerCase() === options.currentStage.toLowerCase()) {
      continuityScore = 0.5;
      continuityReason = "fsm_stage_match";
    } else if (candidate.taxonomy === "planning" || candidate.taxonomy === "insight") {
      continuityScore = 0.3;
      continuityReason = "recent_context_match";
    }

    const sourceScore = SourcePriorityResolver.resolve(candidate);
    const temporalScore = Math.max(0, Math.min(1.0, candidate.decayedImportance));
    const usefulnessScore = RetrievalUsefulnessScorer.score(candidate, options);
    const confidenceScore = ConfidenceBalancer.calculate(candidate, options);

    const baseScore = Number(
      (
        semanticScore * SCORING_CONSTANTS.SEMANTIC_WEIGHT +
        continuityScore * SCORING_CONSTANTS.CONTINUITY_WEIGHT +
        sourceScore * SCORING_CONSTANTS.SOURCE_WEIGHT +
        temporalScore * SCORING_CONSTANTS.TEMPORAL_WEIGHT +
        usefulnessScore * SCORING_CONSTANTS.USEFULNESS_WEIGHT
      ).toFixed(4)
    );

    const finalCombinedScore = Math.max(0.0, Math.min(1.0, baseScore));

    return {
      ...candidate,
      combinedScore: finalCombinedScore,
      scoreBreakdown: {
        semanticScore,
        temporalWeight: temporalScore,
        continuityWeight: continuityScore,
        confidenceScore,
        sourceMultiplier: sourceScore, // map source trust value here for backward compatibility
        combinedScoreBeforeMultiplier: baseScore,
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
      sprintTheme?: string;
      phaseTheme?: string;
      protectedAnchorIds?: string[];
    }
  ): RetrievalCandidate[] {
    return candidates.map(c => this.scoreCandidate(c, options));
  }
}
