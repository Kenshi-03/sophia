import { RetrievalCandidate } from "./types";
import { SourcePriorityResolver, RetrievalUsefulnessScorer, ConfidenceBalancer, detectRetrievalIntent } from "./arbitration";

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
      activeRoadmapPhase?: string;
      activeSprint?: string;
      activeContinuityCluster?: string;
      query?: string;
    }
  ): RetrievalCandidate {
    const semanticScore = Number((Math.max(0, Math.min(100, candidate.relevanceScore)) / 100).toFixed(4));
    
    const activeRoadmapPhase = options?.activeRoadmapPhase || process.env.ACTIVE_ROADMAP_PHASE || "phase-d";
    const activeSprint = options?.activeSprint || process.env.ACTIVE_SPRINT || "sprint-1";
    const activeContinuityCluster = options?.activeContinuityCluster || process.env.ACTIVE_CONTINUITY_CLUSTER || "d13-validation";

    const candRoadmapPhase = candidate.roadmapPhase || candidate.tags?.find(t => t.startsWith("phase:"))?.split(":")[1];
    const candSprintTag = candidate.sprintTag || candidate.tags?.find(t => t.startsWith("sprint:"))?.split(":")[1];
    const candContinuityCluster = candidate.continuityCluster || candidate.tags?.find(t => t.startsWith("cluster:"))?.split(":")[1];
    const candProtectedAnchor = candidate.protectedAnchor || candidate.tags?.includes("protected:true");

    const isSessionMatch = 
      candidate.sourceType === "active_session_context" || 
      (options?.sessionId && candidate.id.includes(options.sessionId));
    
    const isClusterMatch = candContinuityCluster === activeContinuityCluster;
    const continuityType: "active" | "historical" = 
      isSessionMatch || isClusterMatch ? "active" : "historical";

    let continuityScore = 0.0;
    let continuityReason = "none";

    if (continuityType === "active") {
      continuityScore = 1.0;
      continuityReason = isSessionMatch ? "active_session_match" : "active_continuity_match";
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

    // Historical Anchor Soft Decay
    if (candProtectedAnchor && candRoadmapPhase && candRoadmapPhase !== activeRoadmapPhase) {
      continuityScore = Number((continuityScore * 0.80).toFixed(4));
      continuityReason = "historical_decay_applied";
    }

    // Active Sprint Dominance Boost
    const roadmapAligned = candRoadmapPhase === activeRoadmapPhase;
    const sprintAligned = candSprintTag === activeSprint;
    const clusterAligned = candContinuityCluster === activeContinuityCluster;

    let usefulnessBoost = 0.0;
    if (roadmapAligned || sprintAligned || clusterAligned) {
      usefulnessBoost += 0.25;
    }

    // Retrieval Intent Awareness
    if (options?.query && detectRetrievalIntent(options.query)) {
      const isRoadmapOrActiveChain = 
        candidate.sourceType === "roadmap" ||
        candRoadmapPhase === activeRoadmapPhase ||
        candSprintTag === activeSprint ||
        candContinuityCluster === activeContinuityCluster ||
        candidate.category.toLowerCase() === "retrieval" ||
        candidate.category.toLowerCase() === "architecture" ||
        candidate.category.toLowerCase() === "governance";

      if (isRoadmapOrActiveChain) {
        usefulnessBoost += 0.20;
      }
    }

    const baseUsefulness = RetrievalUsefulnessScorer.score(candidate, options);
    const usefulnessScore = Number(Math.max(0.0, Math.min(1.0, baseUsefulness + usefulnessBoost)).toFixed(4));

    const sourceScore = SourcePriorityResolver.resolve(candidate);
    const temporalScore = Math.max(0, Math.min(1.0, candidate.decayedImportance));
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
        sourceMultiplier: sourceScore,
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
      activeRoadmapPhase?: string;
      activeSprint?: string;
      activeContinuityCluster?: string;
      query?: string;
    }
  ): RetrievalCandidate[] {
    return candidates.map(c => this.scoreCandidate(c, options));
  }
}
