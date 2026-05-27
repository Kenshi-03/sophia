import { ContextDiversityEngine, DIVERSITY_CONSTANTS } from "../lib/ai/working-memory/diversity";
import { TokenBudgetEngine } from "../lib/ai/working-memory/budget";
import { RetrievalCandidate, WorkingMemoryState } from "../lib/ai/working-memory/types";

describe("Context Diversity & Temporal Weighting Engine Tests (D1.2-D)", () => {
  const baseCandidate = (id: string, score: number, taxonomy: string, sourceType: any, category = "General", content?: string): RetrievalCandidate => ({
    id,
    content: content || `CandidateContentUniqueAndSpecialForIdentifierNumber${id}`,
    category,
    sourceType,
    taxonomy,
    relevanceScore: score,
    decayedImportance: 0.5,
    combinedScore: score / 100, // simple normalized score representation for mock
    traceReason: "Mock candidate"
  });

  describe("Taxonomy Density Capping", () => {
    it("should cap taxonomy density at max 2 and drop lower-scoring non-protected candidates", () => {
      // 3 candidates in "education" taxonomy
      const c1 = baseCandidate("c1", 85, "education", "semantic_memory");
      const c2 = baseCandidate("c2", 70, "education", "semantic_memory");
      const c3 = baseCandidate("c3", 50, "education", "semantic_memory");

      const result = ContextDiversityEngine.balanceCandidates([c1, c2, c3]);
      
      const ids = result.balanced.map(c => c.id);
      expect(ids).toContain("c1");
      expect(ids).toContain("c2");
      expect(ids).not.toContain("c3"); // c3 has lowest score, pruned by taxonomy cap
      expect(result.metrics.diversityActions.length).toBe(1);
      expect(result.metrics.diversityActions[0]).toContain("taxonomy_cap_exceeded");
    });

    it("should never cap protected anchors, even if they exceed the taxonomy limit", () => {
      const c1 = baseCandidate("c1", 85, "education", "semantic_memory");
      const c2 = baseCandidate("c2", 70, "education", "semantic_memory");
      const c3 = baseCandidate("c3", 50, "education", "semantic_memory");

      // Make c3 a protected anchor
      const result = ContextDiversityEngine.balanceCandidates([c1, c2, c3], {
        protectedAnchorIds: ["c3"]
      });

      const ids = result.balanced.map(c => c.id);
      expect(ids).toContain("c1");
      expect(ids).toContain("c2");
      expect(ids).toContain("c3"); // c3 is kept because it's protected
    });
  });

  describe("Source Diversity Capping", () => {
    it("should cap source density at max 3 per source type and drop lower-scoring non-protected candidates", () => {
      const c1 = baseCandidate("c1", 90, "t1", "semantic_memory", "Cat1");
      const c2 = baseCandidate("c2", 80, "t2", "semantic_memory", "Cat2");
      const c3 = baseCandidate("c3", 70, "t3", "semantic_memory", "Cat3");
      const c4 = baseCandidate("c4", 60, "t4", "semantic_memory", "Cat4");

      const result = ContextDiversityEngine.balanceCandidates([c1, c2, c3, c4]);

      const ids = result.balanced.map(c => c.id);
      expect(ids).toContain("c1");
      expect(ids).toContain("c2");
      expect(ids).toContain("c3");
      expect(ids).not.toContain("c4"); // c4 has lowest score, pruned by source cap
    });
  });

  describe("Bounded Temporal Weighting", () => {
    it("should boost temporal weight to 1.0 for active session or calendar events", () => {
      const sessionCandidate = baseCandidate("sess-1", 70, "t1", "active_session_context");
      
      const result = ContextDiversityEngine.balanceCandidates([sessionCandidate]);
      
      const matched = result.balanced.find(c => c.id === "sess-1");
      expect(matched?.decayedImportance).toBe(1.0);
      expect(result.metrics.freshnessWeightingContribution["sess-1"]).toBe(1.0);
    });

    it("should apply roadmap temporal boost of +0.2 (capped at 1.0)", () => {
      // category matches roadmap or active topic
      const roadmapCandidate = baseCandidate("road-1", 75, "planning", "semantic_memory", "Roadmap");
      
      const result = ContextDiversityEngine.balanceCandidates([roadmapCandidate], {
        activeTopic: "Roadmap"
      });

      const matched = result.balanced.find(c => c.id === "road-1");
      // base decayedImportance is 0.5. With boost it should be 0.5 + 0.2 = 0.7
      expect(matched?.decayedImportance).toBe(0.7);
    });

    it("should floor temporal weight at 0.20 to guarantee long-term memory preservation", () => {
      const oldCandidate = baseCandidate("old-1", 80, "t1", "semantic_memory");
      oldCandidate.decayedImportance = 0.05; // very old

      const result = ContextDiversityEngine.balanceCandidates([oldCandidate]);

      const matched = result.balanced.find(c => c.id === "old-1");
      expect(matched?.decayedImportance).toBe(DIVERSITY_CONSTANTS.MIN_TEMPORAL_WEIGHT); // floored to 0.2
    });

    it("should re-calculate candidate score using ContextScoringEngine when temporal weights change", () => {
      const c = baseCandidate("c", 80, "t1", "semantic_memory");
      c.decayedImportance = 0.05;

      const result = ContextDiversityEngine.balanceCandidates([c]);
      const matched = result.balanced.find(c => c.id === "c");
      
      // Matched candidate temporal weight is floored to 0.2.
      // Relevance score: 80 normalized = 0.8
      // Continuity weight: taxonomy is "t1" -> no match options passed -> continuity weight = 0.0
      // Source priority score (semantic_memory) = 0.5
      // Usefulness score = 0.0
      //
      // Score before multiplier: 0.8 * 0.30 + 0.0 * 0.25 + 0.5 * 0.20 + 0.2 * 0.10 + 0.0 * 0.15
      //                         = 0.24 + 0.0 + 0.10 + 0.02 + 0.0 = 0.3600
      // finalCombinedScore = 0.3600
      expect(matched?.combinedScore).toBeCloseTo(0.3600, 4);
    });
  });

  describe("Echo Chamber Prevention", () => {
    it("should prune candidates with lexical overlap > 0.60 keeping the higher-scoring one", () => {
      const c1 = baseCandidate("c1", 80, "t1", "semantic_memory", "General", "Saya sedang belajar pemrograman Typescript dengan SOPHIA.");
      const c2 = baseCandidate("c2", 60, "t2", "semantic_memory", "General", "Saya sedang belajar pemrograman Typescript dengan SOPHIA.");

      const result = ContextDiversityEngine.balanceCandidates([c1, c2]);

      const ids = result.balanced.map(c => c.id);
      expect(ids).toContain("c1");
      expect(ids).not.toContain("c2"); // c2 is an echo of c1, pruned!
      expect(result.metrics.echoPreventionActions[0]).toContain("duplicate_overlap");
    });

    it("should cap source-theme combination (same sourceType + category) density at max 2", () => {
      const c1 = baseCandidate("c1", 90, "t1", "semantic_memory", "ThemeA");
      const c2 = baseCandidate("c2", 80, "t2", "semantic_memory", "ThemeA");
      const c3 = baseCandidate("c3", 70, "t3", "semantic_memory", "ThemeA");

      const result = ContextDiversityEngine.balanceCandidates([c1, c2, c3]);

      const ids = result.balanced.map(c => c.id);
      expect(ids).toContain("c1");
      expect(ids).toContain("c2");
      expect(ids).not.toContain("c3"); // ThemeA from semantic_memory cap exceeded (max 2)
      expect(result.metrics.repeatedClusterReductionCount).toBe(1);
    });
  });

  describe("Staging Pipeline Integration", () => {
    it("should execute diversity engine in buildSafePipeline and produce diversity metrics in state metadata", () => {
      const mockState: WorkingMemoryState = {
        schemaVersion: 1,
        version: 1,
        executionId: "exec-1",
        userId: "user-1",
        sessionId: "session-1",
        currentStage: "retrieval_staging",
        currentUserInput: "Testing diversity",
        tokenBudget: 1000,
        currentTokenCount: 0,
        lifecycleStatus: "active",
        priority: "normal",
        cleanupReason: "none",
        executionSource: "chat_api",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: Date.now() + 600000,
        retrievalStaging: {
          rawCandidates: [
            {
              id: "profile-1",
              content: "User profile context anchor",
              category: "Profile",
              sourceType: "user_profile",
              taxonomy: "reflection",
              relevanceScore: 100,
              decayedImportance: 1.0,
              combinedScore: 1.0,
              traceReason: "anchor"
            },
            {
              id: "sem-1",
              content: "Semantic memory test candidate",
              category: "General",
              sourceType: "semantic_memory",
              taxonomy: "t1",
              relevanceScore: 80,
              decayedImportance: 0.5,
              combinedScore: 0.8,
              traceReason: "candidate"
            }
          ],
          semanticCandidates: [],
          temporalCandidates: [],
          relationshipCandidates: [],
          metadata: {
            budgetAllocation: {},
            totalRetrievedCount: 2
          },
          traceability: {
            filtersApplied: [],
            discardedIds: [],
            selectionPath: []
          }
        },
        reasoningState: {
          scratchpad: "",
          draftResponse: "",
          temporaryCognitionState: {}
        },
        reflectionPrep: {
          retryTracker: {
            retrieval_retry: 0,
            reflection_retry: 0,
            gateway_retry: 0,
            orchestration_retry: 0
          },
          approvalRequired: false,
          approvalGranted: false,
          confidenceScore: 1.0,
          feedbackBuffer: []
        }
      };

      const result = TokenBudgetEngine.buildSafePipeline(mockState);
      
      expect(result.state.retrievalStaging.metadata.diversityMetrics).toBeDefined();
      expect(result.state.retrievalStaging.metadata.diversityMetrics?.sourceDistribution["user_profile"]).toBe(1);
      expect(result.state.retrievalStaging.metadata.diversityMetrics?.sourceDistribution["semantic_memory"]).toBe(1);
    });
  });
});
