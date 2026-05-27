import { RetrievalArbitrationHooks, ArbitrationStabilityGuardrails } from "../lib/ai/working-memory/arbitration";
import { RetrievalCandidate } from "../lib/ai/working-memory/types";

describe("Retrieval Arbitration Hooks (D1.3)", () => {
  const baseCandidate = (
    id: string,
    relevance: number,
    decayed: number,
    sourceType: any,
    taxonomy = "insight",
    category = "Productivity",
    content = "Sample content"
  ): RetrievalCandidate => ({
    id,
    content,
    category,
    sourceType,
    taxonomy,
    relevanceScore: relevance,
    decayedImportance: decayed,
    combinedScore: 0,
    traceReason: "Test candidate"
  });

  describe("Source Prioritization Hierarchy", () => {
    it("should assign correct priority trust scores to sources", () => {
      const cSystem = baseCandidate("sys-1", 80, 0.9, "semantic_memory", "system", "system");
      const cSession = baseCandidate("sess-1", 80, 0.9, "active_session_context");
      const cProfile = baseCandidate("prof-1", 80, 0.9, "user_profile");
      const cEpisodic = baseCandidate("epi-1", 80, 0.9, "episodic_memory");
      const cSemantic = baseCandidate("sem-1", 80, 0.9, "semantic_memory");
      const cSyntheticHigh = baseCandidate("synth-1", 80, 0.9, "synthetic_context"); // high trust >= 50
      const cSyntheticLow = baseCandidate("synth-2", 40, 0.9, "synthetic_context"); // low trust < 50

      const result = RetrievalArbitrationHooks.arbitrate([
        cSystem, cSession, cProfile, cEpisodic, cSemantic, cSyntheticHigh, cSyntheticLow
      ]);

      const getSourceScore = (id: string) => result.traces.find(t => t.candidateId === id)!.sourceScore;

      expect(getSourceScore("sys-1")).toBe(1.0);
      expect(getSourceScore("sess-1")).toBe(0.9);
      expect(getSourceScore("prof-1")).toBe(0.8);
      expect(getSourceScore("epi-1")).toBe(0.6);
      expect(getSourceScore("sem-1")).toBe(0.5);
      expect(getSourceScore("synth-1")).toBe(0.3);
      expect(getSourceScore("synth-2")).toBe(0.1);
    });
  });

  describe("Retrieval Usefulness Scorer", () => {
    it("should calculate usefulness score based on topic, stage, and type", () => {
      const cRoadmap = baseCandidate("c-road", 80, 0.9, "semantic_memory", "insight", "Roadmap Focus");
      const cStage = baseCandidate("c-stage", 80, 0.9, "semantic_memory", "reasoning", "Productivity");
      const cNormal = baseCandidate("c-norm", 80, 0.9, "semantic_memory", "history", "Productivity");

      const result = RetrievalArbitrationHooks.arbitrate([cRoadmap, cStage, cNormal], {
        activeTopic: "Roadmap Focus",
        currentStage: "reasoning"
      });

      const getUsefulness = (id: string) => result.traces.find(t => t.candidateId === id)!.usefulnessScore;

      // c-road usefulness: matches activeTopic (+0.3) + contains roadmap (+0.15) + insight (+0.15) = 0.6
      expect(getUsefulness("c-road")).toBeCloseTo(0.6, 4);

      // c-stage usefulness: matches currentStage (+0.2) + insight/planning (+0.0 since taxonomy is reasoning, but wait, category is Productivity. No other boost) = 0.2
      expect(getUsefulness("c-stage")).toBeCloseTo(0.2, 4);

      // c-norm usefulness: no matches, taxonomy is history -> 0.0
      expect(getUsefulness("c-norm")).toBe(0.0);
    });
  });

  describe("Duplicate & Echo Suppression", () => {
    it("should apply duplicate overlap penalties to redundant content", () => {
      // Create duplicate texts
      const c1 = baseCandidate("c1", 90, 0.9, "semantic_memory", "insight", "Prod", "Belajar menulis unit test Typescript dengan framework Jest.");
      const c2 = baseCandidate("c2", 80, 0.9, "semantic_memory", "insight", "Prod", "Belajar menulis unit test Typescript dengan framework Jest.");
      const c3 = baseCandidate("c3", 70, 0.9, "semantic_memory", "insight", "Prod", "Belajar menulis unit test Typescript dengan framework Jest.");

      const result = RetrievalArbitrationHooks.arbitrate([c1, c2, c3]);

      const t1 = result.traces.find(t => t.candidateId === "c1")!;
      const t2 = result.traces.find(t => t.candidateId === "c2")!;
      const t3 = result.traces.find(t => t.candidateId === "c3")!;

      // c1 is ranked first (higher base score), so 0 penalty
      expect(t1.duplicatePenalty).toBe(0.0);
      
      // c2 is duplicate of c1 -> base duplicate overlap penalty = 0.20
      expect(t2.duplicatePenalty).toBe(0.20);

      // c3 is duplicate of c1 and c2 -> 2nd duplicate in cluster -> 0.20 + 0.04 = 0.24
      expect(t3.duplicatePenalty).toBe(0.24);
    });

    it("should apply echo penalty to repeated source types and categories in continuity cluster", () => {
      const c1 = baseCandidate("c1", 90, 0.9, "active_session_context", "insight", "SprintFocus", "Task A");
      const c2 = baseCandidate("c2", 80, 0.9, "active_session_context", "insight", "SprintFocus", "Task B");

      const result = RetrievalArbitrationHooks.arbitrate([c1, c2], {
        sessionId: "chat_session_default"
      });

      const t1 = result.traces.find(t => t.candidateId === "c1")!;
      const t2 = result.traces.find(t => t.candidateId === "c2")!;

      // Since active_session_context is 100% exempt from penalties, echo penalty must be 0!
      expect(t1.echoPenalty).toBe(0.0);
      expect(t2.echoPenalty).toBe(0.0);
    });

    it("should apply 50% reduced suppression for episodic memories", () => {
      const c1 = baseCandidate("epi1", 90, 0.9, "episodic_memory", "insight", "Prod", "Belajar menulis unit test.");
      const c2 = baseCandidate("epi2", 80, 0.9, "episodic_memory", "insight", "Prod", "Belajar menulis unit test.");

      const result = RetrievalArbitrationHooks.arbitrate([c1, c2]);

      const t1 = result.traces.find(t => t.candidateId === "epi1")!;
      const t2 = result.traces.find(t => t.candidateId === "epi2")!;

      expect(t1.duplicatePenalty).toBe(0.0);
      
      // Normal duplicate overlap penalty is 0.20. Episodic is 50% exempt -> 0.10 penalty.
      expect(t2.duplicatePenalty).toBe(0.10);
    });
  });

  describe("Deterministic Cognitive Tie-Break Cascade", () => {
    it("should resolve score ties using the usefulness -> continuity -> semantic cascade", () => {
      // Both cand-A and cand-B will compute a finalScore of exactly 0.4000:
      //
      // cand-A:
      // - semanticScore = 0.90 (relevanceScore = 90)
      // - usefulnessScore = 0.20 (category "Prod" matches sprintTheme "Prod")
      // - sourceScore = 0.50, temporalScore = 0.00, continuityScore = 0.00
      // - finalScore = 0.90 * 0.30 + 0.20 * 0.15 + 0.5 * 0.20 = 0.27 + 0.03 + 0.10 = 0.4000
      const candA: RetrievalCandidate = {
        ...baseCandidate("cand-A", 90, 0.0, "semantic_memory", "normal", "Prod", "Pagi hari adalah waktu terbaik untuk melakukan deep work"),
        relevanceScore: 90,
      };
      
      // cand-B:
      // - semanticScore = 1.00 (relevanceScore = 100)
      // - usefulnessScore = 0.00
      // - sourceScore = 0.50, temporalScore = 0.00, continuityScore = 0.00
      // - finalScore = 1.00 * 0.30 + 0.00 * 0.15 + 0.5 * 0.20 = 0.30 + 0.10 = 0.4000
      const candB: RetrievalCandidate = {
        ...baseCandidate("cand-B", 100, 0.0, "semantic_memory", "normal", "General", "Belajar pemrograman Typescript sangat menyenangkan sekali"),
        relevanceScore: 100,
      };

      const result = RetrievalArbitrationHooks.arbitrate([candA, candB], {
        sprintTheme: "Prod"
      });

      // Confirm both candidates computed the exact same final score
      expect(result.traces.find(t => t.candidateId === "cand-A")!.finalScore).toBe(0.4000);
      expect(result.traces.find(t => t.candidateId === "cand-B")!.finalScore).toBe(0.4000);

      // Assert they are sorted correctly (cand-A before cand-B due to usefulnessScore priority in cascade)
      expect(result.candidates[0].id).toBe("cand-A");
      expect(result.candidates[1].id).toBe("cand-B");
    });
  });

  describe("Stability Guardrails and Replay", () => {
    it("should generate deterministic snapshots and verify replays", () => {
      const c1 = baseCandidate("c1", 90, 0.9, "semantic_memory");
      const c2 = baseCandidate("c2", 80, 0.9, "semantic_memory");

      const result = RetrievalArbitrationHooks.arbitrate([c1, c2]);

      expect(result.guardrails).toBeDefined();
      expect(result.guardrails.regressionSnapshot).toBeDefined();
      expect(result.guardrails.scoreMean).toBeGreaterThan(0);

      // Verify replay matches
      const isMatch = ArbitrationStabilityGuardrails.verifyReplay([c1, c2], result.guardrails.regressionSnapshot);
      expect(isMatch).toBe(true);

      // Verify that changes in candidates break replay match
      const differentReplay = ArbitrationStabilityGuardrails.verifyReplay([
        c1,
        { ...c2, relevanceScore: 20 }
      ], result.guardrails.regressionSnapshot);
      
      expect(differentReplay).toBe(false);
    });
  });
});
