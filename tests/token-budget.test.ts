import { TokenBudgetEngine, BUDGET_CONSTANTS } from "../lib/ai/working-memory/budget";
import { RetrievalCandidate, WorkingMemoryState } from "../lib/ai/working-memory/types";

describe("Token Budget Engine Tests (D1.2-A)", () => {
  describe("Token Estimation System", () => {
    it("should calculate baseline estimation with safety buffer", () => {
      // 100 characters baseline:
      // baseEstimate = Math.ceil(100 / 4) = 25 tokens
      // 15% safety buffer = 25 * 1.15 = 28.75 -> ceil(28.75) = 29
      const text = "A".repeat(100);
      const est = TokenBudgetEngine.estimateTokenCount(text);
      expect(est).toBe(29);
    });

    it("should apply correction factor for Indonesian text patterns", () => {
      // "saya pergi dengan dia ke bandung untuk belajar" -> contains: saya, dengan, ke, untuk
      const idText = "Saya ingin pergi dengan dia ke Bandung untuk belajar lebih banyak.";
      const baselineText = "X".repeat(idText.length);

      const idEst = TokenBudgetEngine.estimateTokenCount(idText);
      const baseEst = TokenBudgetEngine.estimateTokenCount(baselineText);

      // Indonesian should be estimated higher due to correction factor
      expect(idEst).toBeGreaterThan(baseEst);
    });

    it("should apply correction factors for punctuation, markdown code, JSON, and URLs", () => {
      const codeText = "```javascript\nconst x = 10;\nconsole.log(x);\n```";
      const jsonText = JSON.stringify({ key: "value", age: 30, tags: ["ai", "cognitive"] });
      const urlText = "Kunjungi website kami di https://sophia.ai/auth/setup untuk onboarding.";

      expect(TokenBudgetEngine.estimateTokenCount(codeText)).toBeGreaterThan(Math.ceil((codeText.length / 4) * 1.15));
      expect(TokenBudgetEngine.estimateTokenCount(jsonText)).toBeGreaterThan(Math.ceil((jsonText.length / 4) * 1.15));
      expect(TokenBudgetEngine.estimateTokenCount(urlText)).toBeGreaterThan(Math.ceil((urlText.length / 4) * 1.15));
    });
  });

  describe("Token Allocation Engine", () => {
    it("should calculate integer-safe allocation percentages based on total budget", () => {
      const totalBudget = 10000;
      const allocations = TokenBudgetEngine.calculateAllocations(totalBudget);

      expect(allocations.systemInstructions).toBe(1500); // 15%
      expect(allocations.userInput).toBe(1500);          // 15%
      expect(allocations.workingMemory).toBe(3000);      // 30%
      expect(allocations.retrievalStaging).toBe(3500);   // 35%
      expect(allocations.reflectionMetadata).toBe(500);  // 5%

      // Total sum allocated = 1500 + 1500 + 3000 + 3500 + 500 = 10000
      expect(allocations.systemInstructions + allocations.userInput + allocations.workingMemory + allocations.retrievalStaging + allocations.reflectionMetadata + allocations.reserve).toBe(totalBudget);
    });

    it("should enforce hard caps on working memory and retrieval layers", () => {
      const hugeBudget = 30000;
      const allocations = TokenBudgetEngine.calculateAllocations(hugeBudget);

      // Hard caps: Working memory = 4000, Retrieval = 5000
      expect(allocations.workingMemory).toBe(4000);
      expect(allocations.retrievalStaging).toBe(5000);

      // Remainder goes to reserve
      expect(allocations.reserve).toBeGreaterThan(0);
    });
  });

  describe("Bounded Categorical Pruning", () => {
    const mockCandidates: RetrievalCandidate[] = [
      {
        id: "profile-1",
        content: "User profile details",
        category: "Behavioral Profile",
        sourceType: "user_profile",
        taxonomy: "reflection",
        relevanceScore: 100,
        decayedImportance: 1.0,
        combinedScore: 1.0,
        traceReason: "test",
      },
      {
        id: "relation-1",
        content: "Relational connection info",
        category: "Semantic Relations",
        sourceType: "relationship_link",
        taxonomy: "reflection",
        relevanceScore: 90,
        decayedImportance: 1.0,
        combinedScore: 0.9,
        traceReason: "test",
      },
      {
        id: "semantic-1",
        content: "Semantic memory details 1",
        category: "Focus",
        sourceType: "semantic_memory",
        taxonomy: "reflection",
        relevanceScore: 80,
        decayedImportance: 1.0,
        combinedScore: 0.8,
        traceReason: "test",
      },
      {
        id: "semantic-2",
        content: "Semantic memory details 2 which is long enough to prune",
        category: "Client",
        sourceType: "semantic_memory",
        taxonomy: "reflection",
        relevanceScore: 70,
        decayedImportance: 1.0,
        combinedScore: 0.7,
        traceReason: "test",
      },
      {
        id: "semantic-3",
        content: "Semantic memory details 3 which has extremely low score",
        category: "Client",
        sourceType: "semantic_memory",
        taxonomy: "reflection",
        relevanceScore: 30,
        decayedImportance: 1.0,
        combinedScore: 0.3,
        traceReason: "test",
      }
    ];

    it("should prune low-score candidates but keep protected anchors", () => {
      // Estimate totals:
      // profile-1: ~7 tokens
      // relation-1: ~9 tokens
      // semantic-1: ~8 tokens
      // semantic-2: ~20 tokens
      // semantic-3: ~20 tokens
      // total tokens: ~64 tokens
      
      // Enforce retrieval budget of 40 tokens (must prune some candidates)
      const result = TokenBudgetEngine.pruneRetrievalCandidates(mockCandidates, 40);

      // semantic-3 has lowest score (0.3), then semantic-2 (0.7).
      // profile-1 (user_profile), relation-1 (relationship_link), and semantic-1 (first semantic_memory)
      // are protected anchors under Bounded Categorical Pruning and cannot be pruned first.
      
      const acceptedIds = result.accepted.map(c => c.id);

      expect(acceptedIds).toContain("profile-1");
      expect(acceptedIds).toContain("relation-1");
      expect(acceptedIds).toContain("semantic-1");
      expect(acceptedIds).not.toContain("semantic-3"); // Pruned because it has lowest score and is not protected!
      
      expect(result.prunedCount).toBeGreaterThan(0);
      expect(result.savedTokens).toBeGreaterThan(0);
      expect(result.pruningTrace.length).toBeGreaterThan(0);
      expect(result.pruningTrace[0].candidateId).toBe("semantic-3");
    });

    it("should always preserve continuity candidates passed in option", () => {
      // Even if semantic-3 has a low score, if we mark it as continuity, it should be kept
      const result = TokenBudgetEngine.pruneRetrievalCandidates(mockCandidates, 40, {
        continuityCandidateIds: ["semantic-3"]
      });

      const acceptedIds = result.accepted.map(c => c.id);
      expect(acceptedIds).toContain("semantic-3");
    });
  });

  describe("Safe Staging Pipeline", () => {
    it("should run buildSafePipeline and produce deterministic budget metrics", () => {
      const mockState: WorkingMemoryState = {
        schemaVersion: 1,
        version: 1,
        executionId: "exec-1",
        userId: "user-1",
        sessionId: "session-1",
        currentStage: "retrieval_staging",
        currentUserInput: "Hello how are you doing",
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
              content: "User profile",
              category: "Profile",
              sourceType: "user_profile",
              taxonomy: "reflection",
              relevanceScore: 100,
              decayedImportance: 1.0,
              combinedScore: 1.0,
              traceReason: "test"
            }
          ],
          semanticCandidates: [],
          temporalCandidates: [],
          relationshipCandidates: [],
          metadata: {
            budgetAllocation: {},
            totalRetrievedCount: 0
          },
          traceability: {
            filtersApplied: [],
            discardedIds: [],
            selectionPath: []
          }
        },
        reasoningState: {
          scratchpad: "Scratchpad reasoning state",
          draftResponse: "Draft answer",
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

      expect(result.budgetVersion).toBe("v1");
      expect(result.budgetPressureLevel).toBeDefined();
      expect(result.state.currentTokenCount).toBeGreaterThan(0);
      expect(result.finalAcceptedTokenCount).toBe(result.state.currentTokenCount);
      
      const metrics = (result.state.retrievalStaging.metadata as any).budgetingMetrics;
      expect(metrics).toBeDefined();
      expect(metrics.budgetVersion).toBe("v1");
    });
  });
});
