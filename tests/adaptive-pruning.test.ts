import { TokenBudgetEngine } from "../lib/ai/working-memory/budget";
import { RetrievalCandidate } from "../lib/ai/working-memory/types";

describe("Adaptive Pruning Engine Tests (D1.2-C)", () => {
  const userProfileAnchor: RetrievalCandidate = {
    id: "profile-1",
    content: "Profil kognitif pengguna untuk preferensi kerja mendalam.",
    category: "Behavioral Profile",
    sourceType: "user_profile",
    taxonomy: "reflection",
    relevanceScore: 100,
    decayedImportance: 1.0,
    combinedScore: 0.95,
    traceReason: "Profile anchor"
  };

  const relationshipAnchor: RetrievalCandidate = {
    id: "relation-1",
    content: "Hubungan terjalin antara tugas A dan pertemuan B.",
    category: "Semantic Relations",
    sourceType: "relationship_link",
    taxonomy: "reflection",
    relevanceScore: 90,
    decayedImportance: 1.0,
    combinedScore: 0.85,
    traceReason: "Relation anchor"
  };

  const semanticAnchor: RetrievalCandidate = {
    id: "semantic-1",
    content: "Catatan penting tentang arsitektur SOPHIA Context Budget.",
    category: "Core Architecture",
    sourceType: "semantic_memory",
    taxonomy: "architecture",
    relevanceScore: 80,
    decayedImportance: 1.0,
    combinedScore: 0.80,
    traceReason: "Semantic memory anchor"
  };

  const activeSessionAnchor: RetrievalCandidate = {
    id: "session-1",
    content: "Konteks sesi aktif percakapan saat ini tentang pruning.",
    category: "Session",
    sourceType: "active_session_context",
    taxonomy: "conversation",
    relevanceScore: 95,
    decayedImportance: 1.0,
    combinedScore: 0.90,
    traceReason: "Session continuity anchor"
  };

  describe("Duplicate Detection & Deduplication", () => {
    it("should calculate word overlap similarity correctly", () => {
      const text1 = "Belajar kecerdasan buatan dengan SOPHIA sangat menyenangkan.";
      const text2 = "Belajar kecerdasan buatan dengan SOPHIA sangat seru.";
      
      const overlap = TokenBudgetEngine.wordOverlapSimilarity(text1, text2);
      // common words: belajar, kecerdasan, buatan, dengan, sophia, sangat
      // unique in text1: menyenangkan
      // unique in text2: seru
      // 6 common words out of min size (7) -> 6/7 = ~0.857
      expect(overlap).toBeGreaterThan(0.70);
    });

    it("should prune duplicate candidates and keep the higher scoring candidate", () => {
      const dup1: RetrievalCandidate = {
        id: "dup-1",
        content: "Materi belajar kecerdasan buatan dan cognitive operating system.",
        category: "Study",
        sourceType: "semantic_memory",
        taxonomy: "education",
        relevanceScore: 70,
        decayedImportance: 1.0,
        combinedScore: 0.75, // Higher score
        traceReason: "Deduplication candidate 1"
      };

      const dup2: RetrievalCandidate = {
        id: "dup-2",
        content: "Materi belajar kecerdasan buatan dan cognitive operating system.",
        category: "Study",
        sourceType: "semantic_memory",
        taxonomy: "education",
        relevanceScore: 60,
        decayedImportance: 1.0,
        combinedScore: 0.65, // Lower score
        traceReason: "Deduplication candidate 2"
      };

      // Set budget so we are overflowing, which triggers deduplication at medium pressure
      // Total tokens: dup1 (~12 tokens), dup2 (~12 tokens) = ~24 tokens
      // Budget: 15 tokens -> forces pruning!
      const result = TokenBudgetEngine.pruneRetrievalCandidates([dup1, dup2], 15);

      const acceptedIds = result.accepted.map(c => c.id);
      expect(acceptedIds).toContain("dup-1");
      expect(acceptedIds).not.toContain("dup-2"); // dup-2 pruned because of overlap > 0.70
      expect(result.duplicateCount).toBe(1);
      expect(result.pruningTrace[0].removedReason).toContain("Duplicate Overlap");
    });
  });

  describe("Structural Anchors & Context Guarantees", () => {
    it("should never prune protected structural anchors even under critical pressure", () => {
      const nonProtected1: RetrievalCandidate = {
        id: "non-prot-1",
        content: "Informasi pendukung opsional yang tidak terlalu penting.",
        category: "Optional",
        sourceType: "semantic_memory",
        taxonomy: "supplemental",
        relevanceScore: 50,
        decayedImportance: 0.5,
        combinedScore: 0.40,
        traceReason: "Optional support info"
      };

      // Under critical pressure, we set budget extremely low
      // Total tokens is high, budget is 5.
      // Even under critical pressure, userProfile, relationship, semantic anchors and active session should be kept.
      const candidates = [
        userProfileAnchor,
        relationshipAnchor,
        semanticAnchor,
        activeSessionAnchor,
        nonProtected1
      ];

      const result = TokenBudgetEngine.pruneRetrievalCandidates(candidates, 5);

      const acceptedIds = result.accepted.map(c => c.id);
      expect(acceptedIds).toContain("profile-1");
      expect(acceptedIds).toContain("relation-1");
      expect(acceptedIds).toContain("semantic-1");
      expect(acceptedIds).toContain("session-1");
      expect(acceptedIds).not.toContain("non-prot-1"); // non-protected is pruned
    });
  });

  describe("Category Density Limits (Pressure-Aware)", () => {
    // We use distinct, non-overlapping contents to prevent duplicate pruning from triggering
    const densityCandidates: RetrievalCandidate[] = [
      {
        id: "sem-edu-0",
        content: "Belajar matematika dasar aljabar linier matriks dan kalkulus peubah banyak.",
        category: "Education",
        sourceType: "semantic_memory",
        taxonomy: "education",
        relevanceScore: 80,
        decayedImportance: 1.0,
        combinedScore: 0.70,
        traceReason: "Density test 0"
      },
      {
        id: "sem-edu-1",
        content: "Panduan praktis pemrograman web menggunakan kerangka kerja Next.js App Router terbaru.",
        category: "Education",
        sourceType: "semantic_memory",
        taxonomy: "education",
        relevanceScore: 75,
        decayedImportance: 1.0,
        combinedScore: 0.65,
        traceReason: "Density test 1"
      },
      {
        id: "sem-edu-2",
        content: "Konsep dasar fisika mekanika klasik hukum newton tentang gerak benda tegar.",
        category: "Education",
        sourceType: "semantic_memory",
        taxonomy: "education",
        relevanceScore: 70,
        decayedImportance: 1.0,
        combinedScore: 0.60,
        traceReason: "Density test 2"
      },
      {
        id: "sem-edu-3",
        content: "Sejarah peradaban kuno mesopotamia sumeria dan perkembangan tulisan cuneiform pertama.",
        category: "Education",
        sourceType: "semantic_memory",
        taxonomy: "education",
        relevanceScore: 65,
        decayedImportance: 1.0,
        combinedScore: 0.55,
        traceReason: "Density test 3"
      },
      {
        id: "sem-edu-4",
        content: "Manajemen keuangan personal investasi reksadana saham obligasi dan dana darurat.",
        category: "Education",
        sourceType: "semantic_memory",
        taxonomy: "education",
        relevanceScore: 60,
        decayedImportance: 1.0,
        combinedScore: 0.50,
        traceReason: "Density test 4"
      }
    ];

    it("should enforce category density limits under medium pressure", () => {
      // Under medium pressure (budget = 115, total tokens = ~127), semantic taxonomy limit is 3.
      // So the top 3 (sem-edu-0, sem-edu-1, sem-edu-2) should be kept, and others pruned by density cap.
      const result = TokenBudgetEngine.pruneRetrievalCandidates(densityCandidates, 115);

      const acceptedIds = result.accepted.map(c => c.id);
      expect(acceptedIds).toContain("sem-edu-0");
      expect(acceptedIds).toContain("sem-edu-1");
      expect(acceptedIds).toContain("sem-edu-2");
      expect(acceptedIds).not.toContain("sem-edu-3");
      expect(acceptedIds).not.toContain("sem-edu-4");
      expect(result.densityPrunedCount).toBe(2);
      expect(result.pruningTrace[0].removedReason).toContain("Category Density Limit Exceeded");
    });

    it("should enforce stricter category density limits under high/critical pressure", () => {
      // Under high pressure (budget = 80, total tokens = ~127), semantic taxonomy limit is 2.
      const result = TokenBudgetEngine.pruneRetrievalCandidates(densityCandidates, 80);

      const acceptedIds = result.accepted.map(c => c.id);
      expect(acceptedIds).toContain("sem-edu-0");
      expect(acceptedIds).toContain("sem-edu-1");
      expect(acceptedIds).not.toContain("sem-edu-2");
      expect(acceptedIds).not.toContain("sem-edu-3");
    });
  });

  describe("Rule-Based Pressure Escalation Stages", () => {
    const highValCandidate: RetrievalCandidate = {
      id: "high-val",
      content: "Konten berharga tinggi sekali tentang arsitektur.",
      category: "General",
      sourceType: "semantic_memory",
      taxonomy: "general",
      relevanceScore: 90,
      decayedImportance: 1.0,
      combinedScore: 0.88,
      traceReason: "High val"
    };

    const midValCandidate: RetrievalCandidate = {
      id: "mid-val",
      content: "Konten berharga sedang untuk pengerjaan proyek.",
      category: "General",
      sourceType: "semantic_memory",
      taxonomy: "general",
      relevanceScore: 50,
      decayedImportance: 0.8,
      combinedScore: 0.40,
      traceReason: "Mid val"
    };

    const lowValCandidate: RetrievalCandidate = {
      id: "low-val",
      content: "Konten berharga rendah yang tidak berguna sama sekali.",
      category: "General",
      sourceType: "semantic_memory",
      taxonomy: "general",
      relevanceScore: 20,
      decayedImportance: 0.5,
      combinedScore: 0.10,
      traceReason: "Low val"
    };

    it("should only prune score < 0.15 under LOW pressure if budget is exceeded", () => {
      // Total tokens: ~50 tokens. Budget: 45 tokens.
      // Under LOW/MEDIUM pressure, we only remove candidate with combinedScore < 0.15.
      // lowValCandidate has combinedScore 0.10 (< 0.15).
      // midValCandidate has combinedScore 0.40 (>= 0.15).
      // Thus, only lowValCandidate should be pruned.
      const result = TokenBudgetEngine.pruneRetrievalCandidates(
        [highValCandidate, midValCandidate, lowValCandidate],
        45
      );

      const acceptedIds = result.accepted.map(c => c.id);
      expect(acceptedIds).toContain("high-val");
      expect(acceptedIds).toContain("mid-val");
      expect(acceptedIds).not.toContain("low-val");
    });

    it("should prune score < 0.45 under HIGH pressure", () => {
      // Set budget low enough that we escalate to HIGH (e.g. budget = 8 tokens)
      // Under HIGH pressure, non-protected candidates with combinedScore < 0.45 are pruned.
      // midValCandidate (combinedScore = 0.40) and lowValCandidate (0.10) should both be pruned.
      const result = TokenBudgetEngine.pruneRetrievalCandidates(
        [highValCandidate, midValCandidate, lowValCandidate],
        8
      );

      const acceptedIds = result.accepted.map(c => c.id);
      expect(acceptedIds).toContain("high-val");
      expect(acceptedIds).not.toContain("mid-val");
      expect(acceptedIds).not.toContain("low-val");
    });
  });
});
