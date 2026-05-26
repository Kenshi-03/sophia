/**
 * SOPHIA Cognition Runtime — Synthetic Memory Seed Script
 * ========================================================
 * 
 * Purpose:
 *   Generates deterministic synthetic cognition dataset for stress-testing
 *   the full D1.1 → D1.2-E pipeline:
 *     - D1.1  WorkingMemory Core
 *     - D1.2-A Token Budgeting
 *     - D1.2-B Context Scoring
 *     - D1.2-C Adaptive Pruning
 *     - D1.2-D Diversity & Temporal Weighting
 *     - D1.2-E Final Context Assembly
 * 
 * Categories seeded:
 *   1. Roadmap / Focus Anchors          (protected structural anchors)
 *   2. Semantic Memory (multi-taxonomy)  (reflection, insight, planning, stress-marker, recovery-event, deep-work-session)
 *   3. Episodic Memory                   (timestamped experiences)
 *   4. Relationship Links                (synthetic relational mapping)
 *   5. Active Session Context            (continuity-critical entries)
 *   6. Noisy / Low-Value Entries         (pruning bait)
 * 
 * Stress vectors:
 *   - Echo Chamber Injection (deliberate near-duplicates)
 *   - Temporal Variance (stale vs. recent entries)
 *   - Taxonomy Density Flooding (>MAX_TAXONOMY_DENSITY per taxonomy)
 *   - High Volume (~60+ entries → forces budget overflow)
 *   - Varied importance / decayRate / reliability for scoring differentiation
 * 
 * Usage:
 *   npx tsx scripts/seed-memory.ts
 * 
 * Idempotency:
 *   Uses contentHash-based upsert. Re-running will not create duplicates.
 * 
 * @module seed-memory
 */

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeContentHash(content: string): string {
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10, 0, 0, 0); // Normalize to 10:00 AM for determinism
  return d;
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

// ─── Seed Data Definitions ──────────────────────────────────────────────────

interface SeedMemory {
  content: string;
  category: string;
  tags: string[];
  importance: number;
  decayRate: number;
  sourceType: string;
  visibility: string;
  taxonomy: string;
  reliability: number;
  memoryType: string;
  createdAt: Date;
}

// ─── 1. ROADMAP / FOCUS ANCHORS ─────────────────────────────────────────────
// These are structural anchors that MUST survive pruning.
// They test: protected anchor detection in D1.2-A, roadmap layer in D1.2-E.

const roadmapMemories: SeedMemory[] = [
  {
    content: "Current development roadmap: Phase D — Context Budget Engine. Focus areas: D1.2-A Token Budgeting, D1.2-B Context Scoring, D1.2-C Adaptive Pruning, D1.2-D Diversity Weighting, D1.2-E Final Assembly. Target: bounded cognition runtime.",
    category: "Roadmap",
    tags: ["roadmap", "phase-d", "context-budget", "architecture"],
    importance: 1.0,
    decayRate: 0.001,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "roadmap",
    reliability: 1.0,
    memoryType: "semantic",
    createdAt: daysAgo(2),
  },
  {
    content: "Executive focus: SOPHIA harus belajar berpikir dengan context secukupnya, bukan mengirim semua memory ke LLM. More context != better cognition. Bounded attention is the goal.",
    category: "Focus",
    tags: ["focus", "philosophy", "bounded-cognition"],
    importance: 0.95,
    decayRate: 0.002,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "roadmap",
    reliability: 1.0,
    memoryType: "semantic",
    createdAt: daysAgo(1),
  },
  {
    content: "Architecture rule: buildSafePipeline() harus pure orchestration-safe function. Tidak boleh Redis write, DB write, atau async side effects. Deterministic cognition governance layer.",
    category: "Roadmap",
    tags: ["architecture", "rules", "budget-engine"],
    importance: 0.90,
    decayRate: 0.003,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "roadmap",
    reliability: 1.0,
    memoryType: "semantic",
    createdAt: daysAgo(3),
  },
];

// ─── 2. SEMANTIC MEMORY (Multi-Taxonomy) ────────────────────────────────────
// Tests: taxonomy diversity balancing (D1.2-D), scoring differentiation (D1.2-B),
//        density limits in pruning (D1.2-C).

const semanticMemories: SeedMemory[] = [
  // --- taxonomy: reflection ---
  {
    content: "Refleksi: Proses pengembangan SOPHIA membutuhkan keseimbangan antara fitur AI dan stabilitas runtime. Perlu lebih banyak unit test untuk working memory pipeline.",
    category: "Development",
    tags: ["reflection", "testing", "stability"],
    importance: 0.70,
    decayRate: 0.02,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.90,
    memoryType: "semantic",
    createdAt: daysAgo(5),
  },
  {
    content: "Refleksi: Belajar dari kesalahan optimistic locking yang menyebabkan race condition di Redis. Solusi: Lua scripting untuk atomic versioned write.",
    category: "Development",
    tags: ["reflection", "redis", "concurrency"],
    importance: 0.75,
    decayRate: 0.02,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.85,
    memoryType: "semantic",
    createdAt: daysAgo(10),
  },
  {
    content: "Refleksi: Penggunaan FSM untuk working memory lifecycle terbukti efektif mencegah invalid state transitions. Pattern ini bisa dipakai di subsystem lain.",
    category: "Development",
    tags: ["reflection", "fsm", "architecture"],
    importance: 0.65,
    decayRate: 0.02,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.90,
    memoryType: "semantic",
    createdAt: daysAgo(15),
  },

  // --- taxonomy: insight ---
  {
    content: "Insight: Token estimation menggunakan heuristik 4 char/token + correction factors menghasilkan akurasi ~90% dibanding BPE tokenizer. Cukup untuk governance layer.",
    category: "Research",
    tags: ["insight", "tokenization", "heuristics"],
    importance: 0.80,
    decayRate: 0.015,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "insight",
    reliability: 0.90,
    memoryType: "semantic",
    createdAt: daysAgo(4),
  },
  {
    content: "Insight: Maximal Marginal Relevance (MMR) dengan lambda 0.65 memberikan balance optimal antara relevance dan diversity untuk context retrieval.",
    category: "Research",
    tags: ["insight", "mmr", "retrieval"],
    importance: 0.85,
    decayRate: 0.01,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "insight",
    reliability: 0.95,
    memoryType: "semantic",
    createdAt: daysAgo(7),
  },
  {
    content: "Insight: Google text-embedding-004 menghasilkan vektor 768 dimensi. Cosine similarity threshold 0.25 sudah cukup untuk initial candidate filtering.",
    category: "Research",
    tags: ["insight", "embedding", "similarity"],
    importance: 0.75,
    decayRate: 0.015,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "insight",
    reliability: 0.90,
    memoryType: "semantic",
    createdAt: daysAgo(12),
  },

  // --- taxonomy: planning ---
  {
    content: "Planning: Setelah D1.2-E selesai, langkah selanjutnya adalah D1.3 — Retrieval Intelligence layer. Akan menambahkan query rewriting dan adaptive retrieval strategies.",
    category: "Development",
    tags: ["planning", "d1.3", "retrieval"],
    importance: 0.80,
    decayRate: 0.01,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "planning",
    reliability: 0.85,
    memoryType: "semantic",
    createdAt: daysAgo(2),
  },
  {
    content: "Planning: Perlu implementasi monitoring dashboard untuk observability metrics dari working memory pipeline. Target: real-time budget pressure visualization.",
    category: "Development",
    tags: ["planning", "monitoring", "observability"],
    importance: 0.70,
    decayRate: 0.015,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "planning",
    reliability: 0.80,
    memoryType: "semantic",
    createdAt: daysAgo(6),
  },

  // --- taxonomy: stress-marker ---
  {
    content: "Stress marker: Deadline tugas Basis Data besok jam 23:59. Masih perlu menyelesaikan normalisasi tabel dan ER diagram. Tekanan cukup tinggi.",
    category: "Academics",
    tags: ["stress", "deadline", "database"],
    importance: 0.90,
    decayRate: 0.05,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "stress-marker",
    reliability: 0.85,
    memoryType: "episodic",
    createdAt: daysAgo(1),
  },
  {
    content: "Stress marker: Rapat organisasi bersamaan dengan sesi deep work. Context switching yang terlalu sering menurunkan fokus secara signifikan.",
    category: "Organization",
    tags: ["stress", "context-switching", "organization"],
    importance: 0.75,
    decayRate: 0.04,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "stress-marker",
    reliability: 0.80,
    memoryType: "episodic",
    createdAt: daysAgo(3),
  },

  // --- taxonomy: recovery-event ---
  {
    content: "Recovery: Sesi workout pagi ini sangat efektif. 30 menit jogging + 20 menit stretching. Fokus siang hari meningkat signifikan setelahnya.",
    category: "Health",
    tags: ["recovery", "workout", "focus"],
    importance: 0.65,
    decayRate: 0.03,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "recovery-event",
    reliability: 0.90,
    memoryType: "episodic",
    createdAt: daysAgo(2),
  },

  // --- taxonomy: deep-work-session ---
  {
    content: "Deep work session: 3 jam coding tanpa distraksi untuk implementasi D1.2-C Adaptive Pruning. Berhasil menyelesaikan 5-stage escalation pipeline. Produktivitas sangat tinggi.",
    category: "Development",
    tags: ["deep-work", "d1.2-c", "pruning"],
    importance: 0.85,
    decayRate: 0.02,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "deep-work-session",
    reliability: 0.95,
    memoryType: "episodic",
    createdAt: daysAgo(4),
  },
  {
    content: "Deep work session: 2 jam riset tentang transformer attention mechanisms untuk memahami bounded cognition patterns. Notes disimpan di Notion.",
    category: "Research",
    tags: ["deep-work", "research", "attention"],
    importance: 0.70,
    decayRate: 0.025,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "deep-work-session",
    reliability: 0.85,
    memoryType: "episodic",
    createdAt: daysAgo(8),
  },
];

// ─── 3. EPISODIC MEMORY ─────────────────────────────────────────────────────
// Tests: temporal weighting (D1.2-D), decay calculation (D1.2-B),
//        historical layer in assembly (D1.2-E).

const episodicMemories: SeedMemory[] = [
  {
    content: "Hari ini menghadiri kuliah Sistem Operasi tentang process scheduling. Materi yang menarik tapi cukup berat. Perlu review ulang sebelum UTS.",
    category: "Academics",
    tags: ["lecture", "operating-systems", "scheduling"],
    importance: 0.60,
    decayRate: 0.03,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.85,
    memoryType: "episodic",
    createdAt: daysAgo(1),
  },
  {
    content: "Meeting dengan tim Hima untuk diskusi program kerja semester depan. Keputusan: fokus ke workshop coding dan mentoring untuk mahasiswa baru.",
    category: "Organization",
    tags: ["meeting", "hima", "program-kerja"],
    importance: 0.65,
    decayRate: 0.03,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.80,
    memoryType: "episodic",
    createdAt: daysAgo(3),
  },
  {
    content: "Ngobrol dengan dosen pembimbing tentang topik skripsi. Disarankan untuk explore area cognitive computing atau AI-assisted productivity systems.",
    category: "Academics",
    tags: ["advisor", "thesis", "discussion"],
    importance: 0.80,
    decayRate: 0.02,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "insight",
    reliability: 0.90,
    memoryType: "episodic",
    createdAt: daysAgo(5),
  },
  {
    content: "Nonton video conference talk tentang context window management di large language models. Sangat relevan dengan arsitektur SOPHIA.",
    category: "Research",
    tags: ["conference", "llm", "context-window"],
    importance: 0.70,
    decayRate: 0.025,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "insight",
    reliability: 0.85,
    memoryType: "episodic",
    createdAt: daysAgo(7),
  },
  // Stale episodic (30+ days old — should have very low temporal weight)
  {
    content: "Mengerjakan tugas pemrograman web semester lalu. Membuat CRUD sederhana dengan Express.js dan MongoDB. Sudah selesai dan dikumpulkan.",
    category: "Academics",
    tags: ["assignment", "web-dev", "old"],
    importance: 0.40,
    decayRate: 0.05,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.70,
    memoryType: "episodic",
    createdAt: daysAgo(45),
  },
  {
    content: "Ikut hackathon kampus bulan lalu. Tim kami membuat aplikasi task management. Menang kategori Best UI/UX.",
    category: "Academics",
    tags: ["hackathon", "competition", "old"],
    importance: 0.55,
    decayRate: 0.04,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.80,
    memoryType: "episodic",
    createdAt: daysAgo(35),
  },
];

// ─── 4. RELATIONSHIP LINKS ──────────────────────────────────────────────────
// Tests: source diversity balancing (D1.2-D), relationship_link scoring (D1.2-B),
//        semantic layer partition in assembly (D1.2-E).

const relationshipMemories: SeedMemory[] = [
  {
    content: "Relasi: Topik 'bounded cognition' berkaitan erat dengan 'token budgeting' dan 'context pruning'. Ketiga konsep ini membentuk fondasi D1.2.",
    category: "Semantic Relations",
    tags: ["relation", "bounded-cognition", "budgeting"],
    importance: 0.80,
    decayRate: 0.01,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.90,
    memoryType: "semantic",
    createdAt: daysAgo(3),
  },
  {
    content: "Relasi: Stress markers pada cognitive profile berkorelasi dengan penurunan productivityConsistency. Pattern ini konsisten selama 2 minggu terakhir.",
    category: "Behavioral Profile",
    tags: ["relation", "stress", "productivity"],
    importance: 0.75,
    decayRate: 0.015,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "insight",
    reliability: 0.85,
    memoryType: "semantic",
    createdAt: daysAgo(5),
  },
  {
    content: "Relasi: Deep work sessions yang dilakukan pagi hari (08:00-11:00) menghasilkan output 40% lebih tinggi dibanding sesi sore hari.",
    category: "Behavioral Profile",
    tags: ["relation", "deep-work", "timing"],
    importance: 0.70,
    decayRate: 0.02,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "insight",
    reliability: 0.80,
    memoryType: "semantic",
    createdAt: daysAgo(8),
  },
  {
    content: "Relasi: Penggunaan FSM pattern di working memory terkait dengan reliability improvement di orchestration layer. Dependency graph: FSM → store → cleanup.",
    category: "Semantic Relations",
    tags: ["relation", "fsm", "architecture"],
    importance: 0.65,
    decayRate: 0.015,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.85,
    memoryType: "semantic",
    createdAt: daysAgo(10),
  },
];

// ─── 5. ACTIVE SESSION CONTEXT ──────────────────────────────────────────────
// Tests: continuity scoring boost (D1.2-B), continuity protection (D1.2-A/C),
//        continuity layer in assembly (D1.2-E).

const activeSessionMemories: SeedMemory[] = [
  {
    content: "Sesi aktif: Sedang mengerjakan implementasi seed-memory.ts untuk cognition runtime testing. Target: 60+ entries covering all 6 memory categories.",
    category: "Development",
    tags: ["active-session", "seed-memory", "current"],
    importance: 1.0,
    decayRate: 0.001,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "planning",
    reliability: 1.0,
    memoryType: "episodic",
    createdAt: hoursAgo(1),
  },
  {
    content: "Sesi aktif: Konteks percakapan terakhir — diskusi tentang D1.2-E Final Context Assembly dan Option A structural truncation strategy.",
    category: "Development",
    tags: ["active-session", "d1.2-e", "assembly"],
    importance: 0.95,
    decayRate: 0.001,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "planning",
    reliability: 1.0,
    memoryType: "episodic",
    createdAt: hoursAgo(2),
  },
  {
    content: "Sesi aktif: Perlu memastikan seed data kompatibel dengan Prisma schema, Redis working memory state, dan seluruh pipeline D1.2.",
    category: "Development",
    tags: ["active-session", "compatibility", "pipeline"],
    importance: 0.90,
    decayRate: 0.002,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "planning",
    reliability: 0.95,
    memoryType: "episodic",
    createdAt: hoursAgo(3),
  },
];

// ─── 6. NOISY / LOW-VALUE ENTRIES ───────────────────────────────────────────
// Tests: low-score pruning threshold (D1.2-A step 2 score<0.15),
//        category density limits (D1.2-A step 3b).
// These SHOULD be pruned under budget pressure.

const noisyMemories: SeedMemory[] = [
  {
    content: "Random thought: Cuaca hari ini mendung. Mungkin akan hujan nanti sore.",
    category: "Random",
    tags: ["noise", "weather"],
    importance: 0.10,
    decayRate: 0.10,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.50,
    memoryType: "episodic",
    createdAt: daysAgo(20),
  },
  {
    content: "Tadi makan nasi goreng di kantin. Rasanya biasa saja.",
    category: "Random",
    tags: ["noise", "food"],
    importance: 0.05,
    decayRate: 0.10,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.40,
    memoryType: "episodic",
    createdAt: daysAgo(25),
  },
  {
    content: "Catatan: Password WiFi kampus sudah diganti lagi. Harus tanya ke bagian IT.",
    category: "Random",
    tags: ["noise", "wifi", "mundane"],
    importance: 0.15,
    decayRate: 0.08,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.50,
    memoryType: "episodic",
    createdAt: daysAgo(18),
  },
  {
    content: "Ada promo di coffee shop depan kampus. Americano cuma 15rb.",
    category: "Random",
    tags: ["noise", "promo", "coffee"],
    importance: 0.08,
    decayRate: 0.10,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.30,
    memoryType: "episodic",
    createdAt: daysAgo(30),
  },
  {
    content: "Teman bilang ada film baru yang bagus. Mungkin nonton akhir pekan ini.",
    category: "Random",
    tags: ["noise", "movie", "social"],
    importance: 0.10,
    decayRate: 0.08,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.40,
    memoryType: "episodic",
    createdAt: daysAgo(14),
  },
  {
    content: "Printer di perpustakaan error lagi. Sudah lapor ke petugas tapi belum diperbaiki.",
    category: "Random",
    tags: ["noise", "printer", "complaint"],
    importance: 0.12,
    decayRate: 0.09,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.45,
    memoryType: "episodic",
    createdAt: daysAgo(22),
  },
  {
    content: "Hari ini antrean di fotokopi panjang sekali. Harus datang lebih pagi besok.",
    category: "Random",
    tags: ["noise", "queue", "mundane"],
    importance: 0.05,
    decayRate: 0.10,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.35,
    memoryType: "episodic",
    createdAt: daysAgo(28),
  },
  {
    content: "Bus kampus terlambat 20 menit hari ini. Terpaksa naik ojol.",
    category: "Random",
    tags: ["noise", "transport", "mundane"],
    importance: 0.08,
    decayRate: 0.10,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.40,
    memoryType: "episodic",
    createdAt: daysAgo(16),
  },
];

// ─── 7. ECHO CHAMBER INJECTION ──────────────────────────────────────────────
// Deliberate near-duplicates with slightly different wording.
// Tests: duplicate detection (word overlap >0.70) in D1.2-A step 3a,
//        echo prevention in D1.2-D phase 4.

const echoChamberMemories: SeedMemory[] = [
  // Near-duplicate pair 1: bounded cognition theme
  {
    content: "SOPHIA harus belajar berpikir dengan context yang cukup, bukan mengirim semua memory ke reasoning engine. Bounded cognition adalah prinsip utama.",
    category: "Development",
    tags: ["echo", "bounded-cognition", "duplicate-1a"],
    importance: 0.85,
    decayRate: 0.01,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "insight",
    reliability: 0.90,
    memoryType: "semantic",
    createdAt: daysAgo(4),
  },
  {
    content: "Prinsip utama SOPHIA: berpikir dengan context secukupnya. Jangan kirim semua memory ke reasoning engine. Bounded cognition harus dijaga.",
    category: "Development",
    tags: ["echo", "bounded-cognition", "duplicate-1b"],
    importance: 0.80,
    decayRate: 0.01,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "insight",
    reliability: 0.85,
    memoryType: "semantic",
    createdAt: daysAgo(6),
  },

  // Near-duplicate pair 2: pruning theme
  {
    content: "Adaptive pruning harus deterministic, explainable, observable, dan bounded. Tidak boleh ada hidden truncation atau probabilistic dropping dalam cognition pipeline.",
    category: "Development",
    tags: ["echo", "pruning", "duplicate-2a"],
    importance: 0.75,
    decayRate: 0.015,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "planning",
    reliability: 0.90,
    memoryType: "semantic",
    createdAt: daysAgo(5),
  },
  {
    content: "Pruning di cognition pipeline harus deterministic dan explainable. Bounded dan observable. Jangan gunakan hidden truncation ataupun probabilistic dropping.",
    category: "Development",
    tags: ["echo", "pruning", "duplicate-2b"],
    importance: 0.70,
    decayRate: 0.015,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "planning",
    reliability: 0.85,
    memoryType: "semantic",
    createdAt: daysAgo(9),
  },

  // Near-duplicate pair 3: assembly theme
  {
    content: "Final context assembly menggunakan 7-layer grouping: system, continuity, identity, roadmap, semantic, historical, auxiliary. Continuity-first ordering.",
    category: "Development",
    tags: ["echo", "assembly", "duplicate-3a"],
    importance: 0.80,
    decayRate: 0.01,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.90,
    memoryType: "semantic",
    createdAt: daysAgo(3),
  },
  {
    content: "Assembly layer SOPHIA: system, continuity, identity, roadmap, semantic, historical, auxiliary. Ordering menggunakan continuity-first approach dengan 7 layer grouping.",
    category: "Development",
    tags: ["echo", "assembly", "duplicate-3b"],
    importance: 0.75,
    decayRate: 0.015,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.85,
    memoryType: "semantic",
    createdAt: daysAgo(7),
  },
];

// ─── 8. TAXONOMY DENSITY FLOODING ───────────────────────────────────────────
// Excessive entries in a single taxonomy to test D1.2-D MAX_TAXONOMY_DENSITY cap.
// All in taxonomy: "reflection" — should exceed density limit (cap=2).

const taxonomyFloodMemories: SeedMemory[] = [
  {
    content: "Taxonomy flood test 1: Penggunaan TypeScript strict mode membantu menangkap banyak type errors di compile time. Sangat direkomendasikan untuk project besar.",
    category: "Development",
    tags: ["flood", "typescript", "reflection"],
    importance: 0.50,
    decayRate: 0.03,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.75,
    memoryType: "semantic",
    createdAt: daysAgo(11),
  },
  {
    content: "Taxonomy flood test 2: Prisma ORM cukup powerful untuk PostgreSQL. Schema-first approach memudahkan migrasi dan type safety.",
    category: "Development",
    tags: ["flood", "prisma", "reflection"],
    importance: 0.55,
    decayRate: 0.025,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.80,
    memoryType: "semantic",
    createdAt: daysAgo(13),
  },
  {
    content: "Taxonomy flood test 3: Redis sebagai ephemeral state store sangat cocok untuk working memory. TTL-based cleanup mencegah memory leak.",
    category: "Development",
    tags: ["flood", "redis", "reflection"],
    importance: 0.60,
    decayRate: 0.02,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.85,
    memoryType: "semantic",
    createdAt: daysAgo(9),
  },
  {
    content: "Taxonomy flood test 4: Next.js App Router dengan server components memberikan performa rendering yang lebih baik dibanding Pages Router.",
    category: "Development",
    tags: ["flood", "nextjs", "reflection"],
    importance: 0.45,
    decayRate: 0.03,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.75,
    memoryType: "semantic",
    createdAt: daysAgo(17),
  },
  {
    content: "Taxonomy flood test 5: BullMQ untuk background job processing bekerja dengan baik bersama Redis. Retry mechanism dan dead letter queue sangat membantu.",
    category: "Development",
    tags: ["flood", "bullmq", "reflection"],
    importance: 0.50,
    decayRate: 0.025,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.80,
    memoryType: "semantic",
    createdAt: daysAgo(14),
  },
];

// ─── 9. VARIED IMPORTANCE ENTRIES ───────────────────────────────────────────
// Tests: scoring differentiation under varied importance/reliability.
// Also adds more sourceType variety for source diversity testing.

const variedImportanceMemories: SeedMemory[] = [
  // Very high importance, high reliability
  {
    content: "Profil Kognitif: Toleransi overload 70%, kualitas pemulihan 50%, konsistensi produktivitas 50%. Deep work timing optimal: 08:00-11:00. Indeks prokrastinasi: rendah.",
    category: "Behavioral Profile",
    tags: ["profile", "cognitive", "high-importance"],
    importance: 1.0,
    decayRate: 0.005,
    sourceType: "chat",
    visibility: "ai-only",
    taxonomy: "reflection",
    reliability: 1.0,
    memoryType: "semantic",
    createdAt: daysAgo(1),
  },
  // Medium importance, medium reliability
  {
    content: "Catatan kuliah: Algoritma Dijkstra menggunakan priority queue untuk shortest path. Kompleksitas O((V+E) log V) dengan binary heap.",
    category: "Academics",
    tags: ["lecture-note", "algorithm", "dijkstra"],
    importance: 0.55,
    decayRate: 0.03,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.85,
    memoryType: "semantic",
    createdAt: daysAgo(10),
  },
  // Low importance, low reliability — pruning bait
  {
    content: "Katanya ada kelas tambahan hari Sabtu tapi belum dikonfirmasi oleh dosen. Informasi belum pasti.",
    category: "Academics",
    tags: ["unconfirmed", "rumor", "low-reliability"],
    importance: 0.20,
    decayRate: 0.06,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "reflection",
    reliability: 0.40,
    memoryType: "episodic",
    createdAt: daysAgo(12),
  },
  // Very old, high importance — temporal weight vs importance conflict
  {
    content: "Prinsip fundamental software engineering: separation of concerns, single responsibility, dan dependency inversion. Selalu berlaku di semua project.",
    category: "Research",
    tags: ["principles", "software-engineering", "timeless"],
    importance: 0.90,
    decayRate: 0.005,
    sourceType: "chat",
    visibility: "private",
    taxonomy: "insight",
    reliability: 0.95,
    memoryType: "semantic",
    createdAt: daysAgo(60),
  },
];

// ─── Aggregate All Seed Data ────────────────────────────────────────────────

const allMemories: SeedMemory[] = [
  ...roadmapMemories,
  ...semanticMemories,
  ...episodicMemories,
  ...relationshipMemories,
  ...activeSessionMemories,
  ...noisyMemories,
  ...echoChamberMemories,
  ...taxonomyFloodMemories,
  ...variedImportanceMemories,
];

// ─── Main Seed Function ─────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  SOPHIA Cognition Runtime — Memory Seed Script");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Total entries to seed: ${allMemories.length}`);
  console.log("");

  // 1. Ensure dev user exists
  const user = await prisma.user.upsert({
    where: { email: "user@sophia.local" },
    update: {},
    create: {
      email: "user@sophia.local",
      name: "Sophia Dev",
    },
  });
  console.log(`  ✓ User: ${user.name} (${user.email}) [${user.id}]`);

  // 2. Ensure CognitiveProfile exists (for user_profile retrieval testing)
  await prisma.cognitiveProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      overloadTolerance: 70.0,
      recoveryQuality: 50.0,
      productivityConsistency: 50.0,
      deepWorkTiming: "08:00-11:00",
      procrastinationIndex: 0.15,
    },
  });
  console.log("  ✓ CognitiveProfile upserted");

  // 3. Seed memories idempotently
  let created = 0;
  let skipped = 0;
  const categoryStats: Record<string, number> = {};
  const taxonomyStats: Record<string, number> = {};

  for (const mem of allMemories) {
    const hash = computeContentHash(mem.content);

    // Idempotency: skip if contentHash already exists for this user
    const existing = await prisma.memoryNode.findFirst({
      where: {
        userId: user.id,
        contentHash: hash,
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.memoryNode.create({
      data: {
        content: mem.content,
        category: mem.category,
        tags: mem.tags,
        importance: mem.importance,
        decayRate: mem.decayRate,
        sourceType: mem.sourceType,
        visibility: mem.visibility,
        taxonomy: mem.taxonomy,
        contentHash: hash,
        reliability: mem.reliability,
        memoryType: mem.memoryType,
        userId: user.id,
        createdAt: mem.createdAt,
      },
    });

    created++;
    categoryStats[mem.category] = (categoryStats[mem.category] || 0) + 1;
    taxonomyStats[mem.taxonomy] = (taxonomyStats[mem.taxonomy] || 0) + 1;
  }

  // 4. Print summary report
  console.log("");
  console.log("─── Seed Results ──────────────────────────────────────────");
  console.log(`  Created: ${created}`);
  console.log(`  Skipped (idempotent): ${skipped}`);
  console.log(`  Total in dataset: ${allMemories.length}`);
  console.log("");

  if (created > 0) {
    console.log("─── Category Distribution ─────────────────────────────────");
    for (const [cat, count] of Object.entries(categoryStats).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${cat.padEnd(25)} ${count}`);
    }
    console.log("");

    console.log("─── Taxonomy Distribution ─────────────────────────────────");
    for (const [tax, count] of Object.entries(taxonomyStats).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${tax.padEnd(25)} ${count}`);
    }
    console.log("");
  }

  // 5. Verify total memory count
  const totalMemories = await prisma.memoryNode.count({
    where: { userId: user.id },
  });
  console.log(`─── Database Verification ─────────────────────────────────`);
  console.log(`  Total MemoryNodes for user: ${totalMemories}`);

  // 6. Stress test readiness check
  const stressIndicators = {
    totalEntries: totalMemories,
    hasDuplicatePairs: echoChamberMemories.length > 0,
    hasNoisyEntries: noisyMemories.length > 0,
    hasTaxonomyFlood: taxonomyFloodMemories.length > 0,
    hasStaleEntries: allMemories.filter(m => {
      const ageMs = Date.now() - m.createdAt.getTime();
      return ageMs > 30 * 24 * 60 * 60 * 1000; // >30 days
    }).length,
    hasActiveSession: activeSessionMemories.length > 0,
    hasRoadmapAnchors: roadmapMemories.length > 0,
    taxonomyCount: new Set(allMemories.map(m => m.taxonomy)).size,
    categoryCount: new Set(allMemories.map(m => m.category)).size,
    sourceTypeCount: new Set(allMemories.map(m => m.sourceType)).size,
  };

  console.log("");
  console.log("─── Stress Test Readiness ─────────────────────────────────");
  console.log(`  Total entries:          ${stressIndicators.totalEntries}`);
  console.log(`  Echo chamber pairs:     ${stressIndicators.hasDuplicatePairs ? "✓ Yes" : "✗ No"}`);
  console.log(`  Noisy entries:          ${stressIndicators.hasNoisyEntries ? "✓ Yes" : "✗ No"}`);
  console.log(`  Taxonomy flood:         ${stressIndicators.hasTaxonomyFlood ? "✓ Yes" : "✗ No"}`);
  console.log(`  Stale entries (>30d):   ${stressIndicators.hasStaleEntries}`);
  console.log(`  Active session:         ${stressIndicators.hasActiveSession ? "✓ Yes" : "✗ No"}`);
  console.log(`  Roadmap anchors:        ${stressIndicators.hasRoadmapAnchors ? "✓ Yes" : "✗ No"}`);
  console.log(`  Distinct taxonomies:    ${stressIndicators.taxonomyCount}`);
  console.log(`  Distinct categories:    ${stressIndicators.categoryCount}`);
  console.log(`  Distinct sourceTypes:   ${stressIndicators.sourceTypeCount}`);
  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Seed completed. Ready for cognition runtime testing.");
  console.log("═══════════════════════════════════════════════════════════");
}

// ─── Entrypoint ─────────────────────────────────────────────────────────────

main()
  .catch((e) => {
    console.error("╗ SEED ERROR ╔", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
