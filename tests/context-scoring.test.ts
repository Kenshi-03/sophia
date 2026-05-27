import { ContextScoringEngine } from "../lib/ai/working-memory/scoring";
import { RetrievalCandidate } from "../lib/ai/working-memory/types";

describe("Context Scoring Engine Tests (D1.2-B / D1.3 Refactored)", () => {
  const baseCandidate: RetrievalCandidate = {
    id: "mem-1",
    content: "Teknik Deep Work sangat efektif dilakukan di pagi hari.",
    category: "Productivity",
    sourceType: "semantic_memory",
    taxonomy: "insight",
    relevanceScore: 85, // normalized to 0.85
    decayedImportance: 0.9,
    combinedScore: 0,
    traceReason: "Semantic search test"
  };

  describe("Combined Usefulness Score Formula", () => {
    it("should calculate combinedScore cleanly using Weighted Addition", () => {
      // Inputs:
      // semanticScore = 0.85
      // temporalWeight = 0.90
      // continuityWeight = 0.3 (taxonomy is "insight" -> recent_context_match boost)
      // sourceScore (semantic_memory) = 0.5
      // usefulnessScore = 0.15 (taxonomy is "insight")
      //
      // Score calculation:
      // 0.85 * 0.30 (semantic) + 0.30 * 0.25 (continuity) + 0.5 * 0.20 (source) + 0.90 * 0.10 (temporal) + 0.15 * 0.15 (usefulness)
      // = 0.255 + 0.075 + 0.10 + 0.09 + 0.0225 = 0.5425
      const scored = ContextScoringEngine.scoreCandidate(baseCandidate);
      
      expect(scored.combinedScore).toBeCloseTo(0.5425, 4);
      expect(scored.scoreBreakdown).toBeDefined();
      expect(scored.scoreBreakdown!.semanticScore).toBe(0.85);
      expect(scored.scoreBreakdown!.temporalWeight).toBe(0.9);
      expect(scored.scoreBreakdown!.continuityWeight).toBe(0.3);
      expect(scored.scoreBreakdown!.confidenceScore).toBeCloseTo(0.85, 4);
      expect(scored.scoreBreakdown!.sourceMultiplier).toBe(0.5);
      expect(scored.scoreBreakdown!.combinedScoreBeforeMultiplier).toBeCloseTo(0.5425, 4);
      expect(scored.scoreBreakdown!.finalCombinedScore).toBeCloseTo(0.5425, 4);
      expect(scored.scoreBreakdown!.continuityReason).toBe("recent_context_match");
    });
  });

  describe("Continuity Weighting", () => {
    it("should boost continuityWeight on activeSessionId match", () => {
      const sessionCandidate = { ...baseCandidate, id: "v1:user:1:working-memory:session-123:mem-1" };
      const scoredSession = ContextScoringEngine.scoreCandidate(sessionCandidate, {
        sessionId: "session-123"
      });

      expect(scoredSession.scoreBreakdown!.continuityWeight).toBe(1.0);
      expect(scoredSession.scoreBreakdown!.continuityReason).toBe("active_session_match");
    });

    it("should apply intermediate continuityWeight on category match", () => {
      const scored = ContextScoringEngine.scoreCandidate(baseCandidate, {
        activeTopic: "Productivity" // matches candidate.category
      });

      expect(scored.scoreBreakdown!.continuityWeight).toBe(0.7);
      expect(scored.scoreBreakdown!.continuityReason).toBe("category_match");
    });

    it("should apply FSM stage continuityWeight on taxonomy match", () => {
      const scored = ContextScoringEngine.scoreCandidate(baseCandidate, {
        currentStage: "insight" // matches candidate.taxonomy
      });

      expect(scored.scoreBreakdown!.continuityWeight).toBe(0.5);
      expect(scored.scoreBreakdown!.continuityReason).toBe("fsm_stage_match");
    });
  });

  describe("Source Prioritization", () => {
    it("should apply higher trust to profiles and relationship links", () => {
      const profileCandidate: RetrievalCandidate = {
        ...baseCandidate,
        sourceType: "user_profile"
      };
      const scoredProfile = ContextScoringEngine.scoreCandidate(profileCandidate);

      // source trust for user_profile is 0.8
      expect(scoredProfile.scoreBreakdown!.sourceMultiplier).toBe(0.80);
    });

    it("should apply lower trust to synthetic_context", () => {
      const syntheticCandidate: RetrievalCandidate = {
        ...baseCandidate,
        sourceType: "synthetic_context",
        relevanceScore: 60
      };
      const scoredSynthetic = ContextScoringEngine.scoreCandidate(syntheticCandidate);

      // source trust for high trust synthetic_context is 0.30
      expect(scoredSynthetic.scoreBreakdown!.sourceMultiplier).toBe(0.30);
    });
  });

  describe("Scoring Multiple Candidates", () => {
    it("should score an array of candidates correctly", () => {
      const candidates = [
        baseCandidate,
        { ...baseCandidate, id: "mem-2", relevanceScore: 50 }
      ];

      const scored = ContextScoringEngine.scoreCandidates(candidates);

      expect(scored.length).toBe(2);
      expect(scored[0].combinedScore).toBeGreaterThan(scored[1].combinedScore);
    });
  });
});
