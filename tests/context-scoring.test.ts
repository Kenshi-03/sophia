import { ContextScoringEngine, SCORING_CONSTANTS } from "../lib/ai/working-memory/scoring";
import { RetrievalCandidate } from "../lib/ai/working-memory/types";

describe("Context Scoring Engine Tests (D1.2-B)", () => {
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
      // semantic = 0.85
      // temporal = 0.90
      // continuity = 0.0 (no match options passed)
      // confidence = 0.85 * 0.9 (semantic_memory reliability lookup is 0.9) = 0.7650
      //
      // combinedScoreBeforeMultiplier = 0.85 * 0.4 + 0.90 * 0.2 + 0.3 * 0.2 + 0.7650 * 0.2
      //                               = 0.34 + 0.18 + 0.06 + 0.153 = 0.7330
      // sourceMultiplier (semantic_memory) = 1.0
      // finalCombinedScore = 0.7330 * 1.0 = 0.7330
      const scored = ContextScoringEngine.scoreCandidate(baseCandidate);
      
      expect(scored.combinedScore).toBeCloseTo(0.7330, 4);
      expect(scored.scoreBreakdown).toBeDefined();
      expect(scored.scoreBreakdown!.semanticScore).toBe(0.85);
      expect(scored.scoreBreakdown!.temporalWeight).toBe(0.9);
      expect(scored.scoreBreakdown!.continuityWeight).toBe(0.3);
      expect(scored.scoreBreakdown!.confidenceScore).toBeCloseTo(0.7650, 4);
      expect(scored.scoreBreakdown!.sourceMultiplier).toBe(1.0);
      expect(scored.scoreBreakdown!.combinedScoreBeforeMultiplier).toBeCloseTo(0.7330, 4);
      expect(scored.scoreBreakdown!.finalCombinedScore).toBeCloseTo(0.7330, 4);
      expect(scored.scoreBreakdown!.continuityReason).toBe("recent_context_match");
    });
  });

  describe("Continuity Weighting", () => {
    it("should boost continuityWeight on activeSessionId match", () => {
      const scored = ContextScoringEngine.scoreCandidate(baseCandidate, {
        sessionId: "session-123"
      });

      // Since id doesn't match, let's pass a candidate that matches the session ID
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

  describe("Source Prioritization Multipliers", () => {
    it("should apply higher multipliers to profiles and relationship links", () => {
      const profileCandidate: RetrievalCandidate = {
        ...baseCandidate,
        sourceType: "user_profile"
      };
      const scoredProfile = ContextScoringEngine.scoreCandidate(profileCandidate);

      // sourceMultiplier for user_profile is 1.30
      expect(scoredProfile.scoreBreakdown!.sourceMultiplier).toBe(1.30);
      expect(scoredProfile.combinedScore).toBeCloseTo(scoredProfile.scoreBreakdown!.combinedScoreBeforeMultiplier * 1.30, 4);
    });

    it("should apply lower multiplier to synthetic_context", () => {
      const syntheticCandidate: RetrievalCandidate = {
        ...baseCandidate,
        sourceType: "synthetic_context"
      };
      const scoredSynthetic = ContextScoringEngine.scoreCandidate(syntheticCandidate);

      // sourceMultiplier for synthetic_context is 0.95
      expect(scoredSynthetic.scoreBreakdown!.sourceMultiplier).toBe(0.95);
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
