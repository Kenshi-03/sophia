import { ReflectionBuffer } from "../lib/ai/working-memory/reflection-buffer";
import { RetrievalCandidate } from "../lib/ai/working-memory/types";

describe("ReflectionBuffer (D1.4)", () => {
  const mockCandidates: RetrievalCandidate[] = [
    {
      id: "cand-1",
      content: "System Rule (D1.3): Duplicate suppression applies an additive overlap penalty. Overlap threshold is set to > 0.70. Duplicate penalty base is 0.20, scaling by +0.04 per extra duplicate up to 0.45 cap. Echo penalty base is 0.10, scaling by +0.03 up to 0.25 cap. Protected anchor exemptions apply.",
      category: "Postgres",
      sourceType: "roadmap",
      taxonomy: "planning",
      relevanceScore: 90,
      decayedImportance: 1.0,
      combinedScore: 0.92,
      traceReason: "test",
      confidence: 0.95,
      reliability: 0.95,
      arbitrationTrace: {
        candidateId: "cand-1",
        semanticScore: 0.90,
        continuityScore: 0.80,
        sourceScore: 0.70,
        confidenceScore: 0.95,
        temporalScore: 0.0,
        usefulnessScore: 0.85,
        duplicatePenalty: 0.0,
        echoPenalty: 0.0,
        finalScore: 0.92,
        selectionDecision: "selected",
        rejectionReason: null,
        dominantIntent: "database"
      }
    },
    {
      id: "cand-2",
      content: "Stabilization: Tie-break works via a deterministic 9-stage cascade: 1. finalScore, 2. usefulnessScore, 3. continuityScore, 4. semanticScore, 5. sourceScore, 6. temporalScore, 7. duplicatePenalty, 8. tokenCount, 9. Lexicographical ID fallback.",
      category: "Governance",
      sourceType: "system",
      taxonomy: "instruction",
      relevanceScore: 85,
      decayedImportance: 0.95,
      combinedScore: 0.90,
      traceReason: "test",
      confidence: 0.90,
      reliability: 0.90,
      arbitrationTrace: {
        candidateId: "cand-2",
        semanticScore: 0.85,
        continuityScore: 1.0,
        sourceScore: 1.0,
        confidenceScore: 0.90,
        temporalScore: 0.0,
        usefulnessScore: 0.90,
        duplicatePenalty: 0.0,
        echoPenalty: 0.0,
        finalScore: 0.90,
        selectionDecision: "selected",
        rejectionReason: null,
        dominantIntent: "governance"
      }
    }
  ];

  describe("Contradiction Detection Hook", () => {
    it("should pass when response matches the canonical baseline details", () => {
      const response = "SOPHIA uses an overlap threshold of 0.70 and duplicate penalty base of 0.20.";
      const res = ReflectionBuffer.contradictionDetection(response, mockCandidates);
      expect(res.flags.possibleContradiction).toBe(false);
      expect(res.score).toBe(0.0);
    });

    it("should flag baseline mismatches (Layer 2) when incorrect parameters are referenced", () => {
      const response = "SOPHIA uses an overlap threshold of 0.75.";
      const res = ReflectionBuffer.contradictionDetection(response, mockCandidates);
      expect(res.flags.possibleContradiction).toBe(true);
      expect(res.flags.contradictionSeverity).toBe("medium");
      expect(res.score).toBe(0.5);
    });

    it("should flag internal conflicts (Layer 1) when both expected and incorrect values co-occur", () => {
      const response = "The overlap threshold is set to 0.70, but some modules override it to 0.75.";
      const res = ReflectionBuffer.contradictionDetection(response, mockCandidates);
      expect(res.flags.possibleContradiction).toBe(true);
      expect(res.flags.contradictionSeverity).toBe("medium");
      expect(res.score).toBe(0.5);
    });

    it("should flag multiple baseline conflicts severely", () => {
      const response = "The threshold is 0.75, duplicate penalty base is 0.30, and soft decay is 0.90.";
      const res = ReflectionBuffer.contradictionDetection(response, mockCandidates);
      expect(res.flags.possibleContradiction).toBe(true);
      expect(res.flags.contradictionSeverity).toBe("high");
      expect(res.score).toBe(0.8);
    });

    it("should detect tie-break cascade out-of-order contradiction", () => {
      const response = "Tie-break cascade order: usefulnessScore then finalScore.";
      const res = ReflectionBuffer.contradictionDetection(response, mockCandidates);
      expect(res.flags.possibleContradiction).toBe(true);
      expect(res.score).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe("Ambiguity Detection Hook", () => {
    it("should detect overlapping intents when query weights are close", () => {
      const query = "roadmap database indexing"; // matches roadmap (0.4) and database (0.8) which has difference > 0.15, wait
      // Let's test with a query that causes close weights or verify the hook logic
      const res = ReflectionBuffer.ambiguityDetection("database infrastructure config", mockCandidates);
      // "database" has postgres, indexing, vector, query, db, sql, database (1 match: 0.40)
      // "infrastructure" has redis, cache, infra, connection, deployment (1 match: 0.40)
      // Difference = 0.0 <= 0.15. Thus should trigger.
      expect(res.flags.ambiguityDetected).toBe(true);
      expect(res.score).toBeGreaterThanOrEqual(0.40);
      expect(res.flags.ambiguityType).toContain("intent_overlap:database_vs_infrastructure");
    });

    it("should detect candidate proximity ambiguity when top candidates are very close in score", () => {
      const res = ReflectionBuffer.ambiguityDetection("arbitration config", mockCandidates);
      // combinedScores are 0.92 and 0.90, difference = 0.02 <= 0.08, different categories (Postgres vs Governance)
      expect(res.flags.ambiguityDetected).toBe(true);
      expect(res.flags.ambiguityType).toContain("candidate_proximity");
    });
  });

  describe("Confidence & Grounding Verifications", () => {
    it("should calculate correct scores based on weighted formulas", () => {
      const telemetry = ReflectionBuffer.verify("arbitration config", "SOPHIA duplicate suppression uses threshold of 0.70 and base penalty of 0.20.", mockCandidates);
      
      expect(telemetry.confidenceScore).toBeGreaterThan(0.0);
      expect(telemetry.groundingScore).toBeGreaterThan(0.0);
      expect(telemetry.diagnosticsSummary).toContain("Status:");
    });

    it("should flag unstable grounding and generic fallback dominance when detail compression is high", () => {
      const telemetry = ReflectionBuffer.verify("arbitration config", "SOPHIA duplicate suppression was applied to remove duplicates.", mockCandidates);
      
      expect(telemetry.detailCompressionRatio).toBeGreaterThan(0.40);
      expect(telemetry.groundingFlags.retrievalDetailLoss).toBe(true);
    });
  });

  describe("Replay Determinism & Bounded Latency Safety", () => {
    it("should yield identical telemetry across multiple runs", () => {
      const q = "arbitration config";
      const r = "SOPHIA uses threshold of 0.70.";
      const t1 = ReflectionBuffer.verify(q, r, mockCandidates);
      
      for (let i = 0; i < 10; i++) {
        const tReplay = ReflectionBuffer.verify(q, r, mockCandidates);
        expect(tReplay).toEqual(t1);
      }
    });

    it("should never mutate candidates or response", () => {
      const candidatesOriginal = JSON.parse(JSON.stringify(mockCandidates));
      const responseOriginal = "SOPHIA uses threshold of 0.70.";
      
      ReflectionBuffer.verify("query", responseOriginal, mockCandidates);
      
      expect(mockCandidates).toEqual(candidatesOriginal);
      expect(responseOriginal).toBe("SOPHIA uses threshold of 0.70.");
    });

    it("should execute with minimal latency overhead", () => {
      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        ReflectionBuffer.verify("query", "SOPHIA uses threshold of 0.70.", mockCandidates);
      }
      const duration = Date.now() - start;
      const avgDuration = duration / 100;
      console.log(`Average Reflection Buffer verification latency: ${avgDuration}ms`);
      // Assert that single execution is extremely low (e.g. < 5ms average)
      expect(avgDuration).toBeLessThan(5);
    });
  });
});
