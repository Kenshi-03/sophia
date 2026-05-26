import { ContextAssemblyEngine, ContextAssemblyError } from "../lib/ai/working-memory/assembly";
import { TokenBudgetEngine } from "../lib/ai/working-memory/budget";
import { RetrievalCandidate, WorkingMemoryState } from "../lib/ai/working-memory/types";
import { assembleAgentContext } from "../lib/ai/orchestration/context-manager";

describe("Context Assembly Engine Tests (D1.2-E)", () => {
  const baseCandidate = (
    id: string,
    score: number,
    taxonomy: string,
    sourceType: any,
    category = "General",
    content?: string
  ): RetrievalCandidate => ({
    id,
    content: content || `ContextCandidateValueWithKeyIdentifiedBy${id}`,
    category,
    sourceType,
    taxonomy,
    relevanceScore: score,
    decayedImportance: 0.5,
    combinedScore: score / 100, // mock score normalize
    traceReason: "test candidate"
  });

  describe("Executive Layer Grouping & Ordering", () => {
    it("should distribute candidates to correct layers and sort by combinedScore descending", () => {
      // 1 user profile (identity)
      const profile = baseCandidate("prof-1", 90, "identity", "user_profile");
      // 2 semantic memories (one higher score)
      const sem1 = baseCandidate("sem-1", 70, "t1", "semantic_memory", "Core");
      const sem2 = baseCandidate("sem-2", 85, "t1", "semantic_memory", "Core");
      // 1 active session message (continuity)
      const sess = baseCandidate("sess-1", 95, "t1", "active_session_context");
      // 1 roadmap topic
      const roadmap = baseCandidate("road-1", 60, "t1", "semantic_memory", "Roadmap");

      const assembled = ContextAssemblyEngine.assemble([profile, sem1, sem2, sess, roadmap], {
        tokenBudget: 5000,
        activeTopic: "Roadmap"
      });

      expect(assembled.continuityLayer).toContain("sess-1");
      expect(assembled.identityLayer).toContain("prof-1");
      expect(assembled.roadmapLayer).toContain("road-1");
      // Semantic layer should sort sem2 (score 0.85) before sem1 (score 0.70)
      const semLines = assembled.semanticLayer.split("\n");
      const sem2Idx = semLines.findIndex(l => l.includes("sem-2"));
      const sem1Idx = semLines.findIndex(l => l.includes("sem-1"));
      expect(sem2Idx).toBeLessThan(sem1Idx);
    });
  });

  describe("Token Validation & Final Truncation (Option A)", () => {
    it("should truncate lowest-scoring non-protected candidates if total exceeds budget", () => {
      const c1 = baseCandidate("c1", 90, "t1", "semantic_memory", "General", "A".repeat(500)); // ~145 tokens
      const c2 = baseCandidate("c2", 80, "t1", "semantic_memory", "General", "B".repeat(500)); // ~145 tokens
      const c3 = baseCandidate("c3", 70, "t1", "semantic_memory", "General", "C".repeat(500)); // ~145 tokens

      // Set extremely low budget so that it overflows.
      // Total tokens: ~435 tokens. Budget: 380 tokens.
      // Candidate c3 has lowest score, so it should be truncated.
      const assembled = ContextAssemblyEngine.assemble([c1, c2, c3], {
        tokenBudget: 380,
        extraTokenCount: 0 // no extra token overhead
      });

      expect(assembled.metadata.overflowDetected).toBe(true);
      expect(assembled.metadata.truncatedCandidateIds).toContain("c3");
      expect(assembled.metadata.truncatedCandidateIds).not.toContain("c1");
      expect(assembled.metadata.truncatedCandidateIds).not.toContain("c2");
      expect(assembled.semanticLayer).toContain("A".repeat(100));
      expect(assembled.semanticLayer).toContain("B".repeat(100));
      expect(assembled.semanticLayer).not.toContain("C".repeat(100));
      expect(assembled.metadata.validationPassed).toBe(true);
    });

    it("should never truncate protected candidates", () => {
      const c1 = baseCandidate("c1", 90, "t1", "semantic_memory", "General", "A".repeat(500));
      const c2 = baseCandidate("c2", 70, "t1", "semantic_memory", "General", "B".repeat(500)); // lower score
      const c3 = baseCandidate("c3", 80, "t1", "semantic_memory", "General", "C".repeat(500));

      // Make c2 (lowest score) protected
      const assembled = ContextAssemblyEngine.assemble([c1, c2, c3], {
        tokenBudget: 900,
        protectedAnchorIds: ["c2"]
      });

      // Since c2 is protected, c3 (next lowest score) should be truncated instead of c2!
      expect(assembled.metadata.truncatedCandidateIds).toContain("c3");
      expect(assembled.metadata.truncatedCandidateIds).not.toContain("c2");
      expect(assembled.semanticLayer).toContain("B".repeat(100));
      expect(assembled.semanticLayer).not.toContain("C".repeat(100));
    });

    it("should throw ContextAssemblyError if overflow remains after truncating all non-protected candidates", () => {
      const c1 = baseCandidate("c1", 90, "t1", "semantic_memory", "General", "A".repeat(500));
      const c2 = baseCandidate("c2", 80, "t1", "semantic_memory", "General", "B".repeat(500));

      // Both candidates are protected anchors
      const runFn = () => {
        ContextAssemblyEngine.assemble([c1, c2], {
          tokenBudget: 150,
          protectedAnchorIds: ["c1", "c2"]
        });
      };

      expect(runFn).toThrow(ContextAssemblyError);
    });
  });

  describe("Integration & Staging", () => {
    it("should populate assembledContext during buildSafePipeline", () => {
      const mockState: WorkingMemoryState = {
        schemaVersion: 1,
        version: 1,
        executionId: "exec-1",
        userId: "user-1",
        sessionId: "session-1",
        currentStage: "retrieval_staging",
        currentUserInput: "Testing assembly integration",
        tokenBudget: 2000,
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
              content: "Cognitive Profile preferences",
              category: "Profile",
              sourceType: "user_profile",
              taxonomy: "reflection",
              relevanceScore: 100,
              decayedImportance: 1.0,
              combinedScore: 1.0,
              traceReason: "anchor"
            }
          ],
          semanticCandidates: [],
          temporalCandidates: [],
          relationshipCandidates: [],
          metadata: {
            budgetAllocation: {},
            totalRetrievedCount: 1
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
      
      const assembled = result.state.retrievalStaging.metadata.assembledContext;
      expect(assembled).toBeDefined();
      expect(assembled?.identityLayer).toContain("Cognitive Profile preferences");
      expect(assembled?.metadata.totalTokens).toBeGreaterThan(0);
    });

    it("should render structured layered context inside assembleAgentContext", () => {
      const profile = baseCandidate("prof-1", 90, "identity", "user_profile");
      const sem = baseCandidate("sem-1", 80, "t1", "semantic_memory");

      const output = assembleAgentContext("What is deep work?", [profile, sem], []);
      
      expect(output).toContain("USER QUERY: What is deep work?");
      expect(output).toContain("=== USER IDENTITY & PROFILE ===");
      expect(output).toContain("=== TOP SEMANTIC MEMORIES ===");
      expect(output).toContain("prof-1");
      expect(output).toContain("sem-1");
    });
  });
});
