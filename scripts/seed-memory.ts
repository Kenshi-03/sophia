/**
 * SOPHIA Cognition Runtime — Synthetic Memory Seed Script (D1.3 Enhanced)
 * =========================================================================
 * 
 * Purpose:
 *   Generates a deterministic, bounded synthetic cognition ecosystem for
 *   D1.3 Runtime Stabilization Validation:
 *     - Duplicate Cluster Suppression
 *     - Continuity Weighting & Reinforcement
 *     - Source Prioritization (system > roadmap > user > episodic > synthetic)
 *     - Confidence Balancing & Penalisations
 *     - Active Session Continuity Chains
 *     - Topic Drift Resistance
 *     - Replay Validation Scenario Testing
 * 
 * Usage:
 *   npx tsx scripts/seed-memory.ts
 * 
 * Idempotency:
 *   Uses stable deterministic IDs (e.g. "seed-sys-01"). Re-running will upsert
 *   without duplicating records.
 * 
 * @module seed-memory
 */

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { RetrievalArbitrationHooks } from "../lib/ai/working-memory/arbitration";
import { RetrievalCandidate } from "../lib/ai/working-memory/types";

const prisma = new PrismaClient();

// ─── Helpers & Determinism ───────────────────────────────────────────────────

const BASE_DATE = new Date("2026-05-27T10:00:00Z");

function computeContentHash(content: string): string {
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}

function daysAgo(days: number): Date {
  const d = new Date(BASE_DATE);
  d.setDate(d.getDate() - days);
  return d;
}

// ─── Seed Data Definitions ──────────────────────────────────────────────────

interface SeedMemory {
  id: string;
  content: string;
  sourceType: "system" | "roadmap" | "explicit_user" | "episodic" | "synthetic";
  memoryType: "anchor" | "continuity" | "episodic" | "inferred" | "reflection" | "planning";
  taxonomy?: string;
  category?: string;
  visibility?: string;
  tags?: string[];
  continuityCluster?: string;
  roadmapPhase?: string;
  sprintTag?: string;
  protectedAnchor?: boolean;
  confidence?: number;
  reliability?: number;
  importance?: number;
  decayRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── SECTION 1: ARBITRATION DUPLICATE CLUSTERS (20 memories) ──────────────────
// High-density semantically overlapping candidates to trigger overlap & echo penalties.
const duplicateClusterMemories: SeedMemory[] = [
  // Cluster A: "Retrieval Arbitration" (5 memories)
  {
    id: "seed-dup-01",
    content: "Retrieval arbitration hooks are essential for governing context candidate selection in SOPHIA.",
    category: "Retrieval",
    sourceType: "system",
    memoryType: "anchor",
    taxonomy: "anchor",
    protectedAnchor: true,
    importance: 0.95,
    decayRate: 0.001,
    reliability: 1.0,
    confidence: 1.0,
    visibility: "private",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "seed-dup-02",
    content: "Retrieval arbitration hooks are crucial for governing context candidate selection in SOPHIA, allowing developers to manage context length and avoid duplicate nodes in the attention window.",
    category: "Retrieval",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    importance: 0.80,
    decayRate: 0.01,
    reliability: 0.90,
    confidence: 0.90,
    visibility: "private",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "seed-dup-03",
    content: "Retrieval arbitration hooks are important for governing context candidate selection in SOPHIA.",
    category: "Retrieval",
    sourceType: "explicit_user",
    memoryType: "reflection",
    taxonomy: "insight",
    importance: 0.75,
    decayRate: 0.02,
    reliability: 0.85,
    confidence: 0.80,
    visibility: "private",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },
  {
    id: "seed-dup-04",
    content: "Retrieval arbitration hooks are required for governing context candidate selection in SOPHIA, providing a bounded cognitive attention span.",
    category: "Retrieval",
    sourceType: "episodic",
    memoryType: "episodic",
    taxonomy: "reflection",
    importance: 0.70,
    decayRate: 0.03,
    reliability: 0.80,
    confidence: 0.75,
    visibility: "private",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: "seed-dup-05",
    content: "Retrieval arbitration hooks are needed for governing context candidate selection in SOPHIA.",
    category: "Retrieval",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    importance: 0.65,
    decayRate: 0.04,
    reliability: 0.60,
    confidence: 0.50,
    visibility: "private",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(6),
  },

  // Cluster B: "Deterministic Cognition" (5 memories)
  {
    id: "seed-dup-06",
    content: "SOPHIA requires deterministic-first cognition behavior to guarantee predictable execution flows.",
    category: "Architecture",
    sourceType: "system",
    memoryType: "anchor",
    taxonomy: "anchor",
    protectedAnchor: true,
    importance: 0.98,
    decayRate: 0.001,
    reliability: 1.0,
    confidence: 1.0,
    visibility: "private",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "seed-dup-07",
    content: "SOPHIA requires deterministic-first cognition behavior to ensure predictable execution flows.",
    category: "Architecture",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    importance: 0.85,
    decayRate: 0.005,
    reliability: 0.95,
    confidence: 0.95,
    visibility: "private",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "seed-dup-08",
    content: "SOPHIA requires deterministic-first cognition behavior to secure predictable execution flows.",
    category: "Architecture",
    sourceType: "explicit_user",
    memoryType: "reflection",
    taxonomy: "insight",
    importance: 0.80,
    decayRate: 0.015,
    reliability: 0.90,
    confidence: 0.85,
    visibility: "private",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "seed-dup-09",
    content: "SOPHIA requires deterministic-first cognition behavior to maintain predictable execution flows.",
    category: "Architecture",
    sourceType: "episodic",
    memoryType: "episodic",
    taxonomy: "reflection",
    importance: 0.75,
    decayRate: 0.025,
    reliability: 0.80,
    confidence: 0.70,
    visibility: "private",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: "seed-dup-10",
    content: "SOPHIA requires deterministic-first cognition behavior to provide predictable execution flows.",
    category: "Architecture",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    importance: 0.70,
    decayRate: 0.035,
    reliability: 0.70,
    confidence: 0.60,
    visibility: "private",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(8),
  },

  // Cluster C: "Weighted Governance" (5 memories)
  {
    id: "seed-dup-11",
    content: "Weighted governance aggregation calculates final candidate scores based on semantic, continuity, and source priority.",
    category: "Governance",
    sourceType: "system",
    memoryType: "anchor",
    taxonomy: "anchor",
    protectedAnchor: true,
    importance: 0.90,
    decayRate: 0.002,
    reliability: 1.0,
    confidence: 1.0,
    visibility: "private",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "seed-dup-12",
    content: "Weighted governance aggregation determines final candidate scores based on semantic, continuity, and source priority.",
    category: "Governance",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    importance: 0.85,
    decayRate: 0.008,
    reliability: 0.95,
    confidence: 0.95,
    visibility: "private",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "seed-dup-13",
    content: "Weighted governance aggregation computes final candidate scores based on semantic, continuity, and source priority.",
    category: "Governance",
    sourceType: "explicit_user",
    memoryType: "reflection",
    taxonomy: "insight",
    importance: 0.78,
    decayRate: 0.012,
    reliability: 0.90,
    confidence: 0.80,
    visibility: "private",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },
  {
    id: "seed-dup-14",
    content: "Weighted governance aggregation evaluates final candidate scores based on semantic, continuity, and source priority.",
    category: "Governance",
    sourceType: "episodic",
    memoryType: "episodic",
    taxonomy: "reflection",
    importance: 0.72,
    decayRate: 0.022,
    reliability: 0.85,
    confidence: 0.75,
    visibility: "private",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(6),
  },
  {
    id: "seed-dup-15",
    content: "Weighted governance aggregation establishes final candidate scores based on semantic, continuity, and source priority.",
    category: "Governance",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    importance: 0.68,
    decayRate: 0.032,
    reliability: 0.65,
    confidence: 0.60,
    visibility: "private",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(9),
  },

  // Cluster D: "Memory Selection & Continuity" (5 memories)
  {
    id: "seed-dup-16",
    content: "Memory selection preserves context continuity across multi-turn user conversation threads.",
    category: "Testing",
    sourceType: "system",
    memoryType: "anchor",
    taxonomy: "anchor",
    protectedAnchor: true,
    importance: 0.92,
    decayRate: 0.002,
    reliability: 1.0,
    confidence: 1.0,
    visibility: "private",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "seed-dup-17",
    content: "Memory selection guarantees context continuity across multi-turn user conversation threads.",
    category: "Testing",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    importance: 0.88,
    decayRate: 0.007,
    reliability: 0.95,
    confidence: 0.95,
    visibility: "private",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "seed-dup-18",
    content: "Memory selection maintains context continuity across multi-turn user conversation threads.",
    category: "Testing",
    sourceType: "explicit_user",
    memoryType: "reflection",
    taxonomy: "insight",
    importance: 0.84,
    decayRate: 0.015,
    reliability: 0.90,
    confidence: 0.80,
    visibility: "private",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "seed-dup-19",
    content: "Memory selection supports context continuity across multi-turn user conversation threads.",
    category: "Testing",
    sourceType: "episodic",
    memoryType: "episodic",
    taxonomy: "reflection",
    importance: 0.78,
    decayRate: 0.025,
    reliability: 0.80,
    confidence: 0.70,
    visibility: "private",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: "seed-dup-20",
    content: "Memory selection tracks context continuity across multi-turn user conversation threads.",
    category: "Testing",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    importance: 0.70,
    decayRate: 0.035,
    reliability: 0.60,
    confidence: 0.50,
    visibility: "private",
    createdAt: daysAgo(7),
    updatedAt: daysAgo(7),
  },
];

// ─── SECTION 2: SYNTHETIC INFERENCE MEMORIES (12 memories) ──────────────────
// Low-trust inferred/synthetic memories to verify ConfidenceBalancer & penalties.
const syntheticInferenceMemories: SeedMemory[] = [
  {
    id: "seed-synth-01",
    content: "Synthetic inference: User may prefer lavender accent theme based on high productivity intensity sessions.",
    category: "Focus",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    continuityCluster: "theme-preferences",
    importance: 0.50,
    decayRate: 0.05,
    reliability: 0.40,
    confidence: 0.40,
    visibility: "private",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "seed-synth-02",
    content: "Synthetic inference: Hypothetical cognitive limits could trigger early pruning scaling adjustments.",
    category: "Architecture",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    importance: 0.45,
    decayRate: 0.06,
    reliability: 0.30,
    confidence: 0.35,
    visibility: "private",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: "seed-synth-03",
    content: "Synthetic inference: User might require lower cognitive thresholds during high organization deadlines.",
    category: "Academics",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    importance: 0.55,
    decayRate: 0.04,
    reliability: 0.40,
    confidence: 0.45,
    visibility: "private",
    createdAt: daysAgo(7),
    updatedAt: daysAgo(7),
  },
  {
    id: "seed-synth-04",
    content: "Synthetic inference: Speculative future roadmap capabilities could include recursive feedback systems.",
    category: "Roadmap",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    importance: 0.40,
    decayRate: 0.08,
    reliability: 0.30,
    confidence: 0.30,
    visibility: "private",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(9),
  },
  {
    id: "seed-synth-05",
    content: "Synthetic inference: Automatic Do-Not-Disturb calendar sync focus boosts productivity by ~12%.",
    category: "Focus",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    continuityCluster: "focus-rhythms",
    importance: 0.60,
    decayRate: 0.03,
    reliability: 0.50,
    confidence: 0.50,
    visibility: "private",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },
  {
    id: "seed-synth-06",
    content: "Synthetic inference: Deep work timing preferences lean toward early mornings based on workout recovery events.",
    category: "Focus",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    continuityCluster: "focus-rhythms",
    importance: 0.58,
    decayRate: 0.03,
    reliability: 0.45,
    confidence: 0.48,
    visibility: "private",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(6),
  },
  {
    id: "seed-synth-07",
    content: "Synthetic inference: User could benefit from strict temporal decay adjustments during sprint migrations.",
    category: "Retrieval",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    importance: 0.35,
    decayRate: 0.07,
    reliability: 0.30,
    confidence: 0.25,
    visibility: "private",
    createdAt: daysAgo(12),
    updatedAt: daysAgo(12),
  },
  {
    id: "seed-synth-08",
    content: "Synthetic inference: Inferred user focus shifts towards backend scaling and DB query tuning options.",
    category: "Retrieval",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    importance: 0.52,
    decayRate: 0.04,
    reliability: 0.40,
    confidence: 0.42,
    visibility: "private",
    createdAt: daysAgo(15),
    updatedAt: daysAgo(15),
  },
  {
    id: "seed-synth-09",
    content: "Synthetic inference: Hypothetical cognitive model additions may require extra token staging buffer size.",
    category: "Architecture",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    importance: 0.42,
    decayRate: 0.05,
    reliability: 0.35,
    confidence: 0.32,
    visibility: "private",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(20),
  },
  {
    id: "seed-synth-10",
    content: "Synthetic inference: User productivity intensity might decrease on Friday afternoons due to fatigue build.",
    category: "Focus",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    continuityCluster: "focus-rhythms",
    importance: 0.48,
    decayRate: 0.05,
    reliability: 0.40,
    confidence: 0.38,
    visibility: "private",
    createdAt: daysAgo(11),
    updatedAt: daysAgo(11),
  },
  {
    id: "seed-synth-11",
    content: "Synthetic inference: Speculative outline suggests calendar categorisation needs automatic tagging tools.",
    category: "Retrieval",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    importance: 0.30,
    decayRate: 0.09,
    reliability: 0.25,
    confidence: 0.20,
    visibility: "private",
    createdAt: daysAgo(25),
    updatedAt: daysAgo(25),
  },
  {
    id: "seed-synth-12",
    content: "Synthetic inference: Speculative cognitive maps show strong links between task completion and physical health.",
    category: "Focus",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    continuityCluster: "focus-rhythms",
    importance: 0.54,
    decayRate: 0.03,
    reliability: 0.40,
    confidence: 0.44,
    visibility: "private",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(8),
  },
];

// ─── SECTION 3: ACTIVE SESSION CONTINUITY CHAINS (18 memories) ───────────────
// Chains of linked memories to check continuity reinforcement and preservation.
const continuityChainMemories: SeedMemory[] = [
  // Chain A: "D1.3 Validation" (6 memories)
  {
    id: "seed-cont-01",
    content: "Continuity Chain: We need to write automated scenarios for testing D1.3 stabilization.",
    category: "Retrieval",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    continuityCluster: "d13-validation",
    roadmapPhase: "phase-d",
    sprintTag: "sprint-1",
    importance: 0.90,
    decayRate: 0.001,
    reliability: 0.95,
    confidence: 0.95,
    visibility: "private",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "seed-cont-02",
    content: "Continuity Chain: D1.3 validation scenarios must assert duplicate suppression effectiveness.",
    category: "Retrieval",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    continuityCluster: "d13-validation",
    roadmapPhase: "phase-d",
    sprintTag: "sprint-1",
    importance: 0.88,
    decayRate: 0.002,
    reliability: 0.95,
    confidence: 0.95,
    visibility: "private",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "seed-cont-03",
    content: "Continuity Chain: Scenarios should load duplicate cluster sets and verify resulting final scores.",
    category: "Retrieval",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    continuityCluster: "d13-validation",
    roadmapPhase: "phase-d",
    sprintTag: "sprint-1",
    importance: 0.86,
    decayRate: 0.003,
    reliability: 0.90,
    confidence: 0.90,
    visibility: "private",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "seed-cont-04",
    content: "Continuity Chain: We observed duplicate scaling factors correctly penalisng overlapping content.",
    category: "Retrieval",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    continuityCluster: "d13-validation",
    roadmapPhase: "phase-d",
    sprintTag: "sprint-1",
    importance: 0.84,
    decayRate: 0.004,
    reliability: 0.90,
    confidence: 0.90,
    visibility: "private",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "seed-cont-05",
    content: "Continuity Chain: Debugging reports show tie-breaker cascade prevents ranking oscillations during validations.",
    category: "Retrieval",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    continuityCluster: "d13-validation",
    roadmapPhase: "phase-d",
    sprintTag: "sprint-1",
    importance: 0.82,
    decayRate: 0.005,
    reliability: 0.90,
    confidence: 0.90,
    visibility: "private",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "seed-cont-06",
    content: "Continuity Chain: Replay testing scenario will verify deterministic guardrails output matching footprint hash.",
    category: "Retrieval",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    continuityCluster: "d13-validation",
    roadmapPhase: "phase-d",
    sprintTag: "sprint-1",
    importance: 0.80,
    decayRate: 0.006,
    reliability: 0.90,
    confidence: 0.90,
    visibility: "private",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },

  // Chain B: "Arbitration Stabilization" (6 memories)
  {
    id: "seed-cont-07",
    content: "Stabilization: Initiated testing for arbitration stability across multiple concurrent sessions.",
    category: "Governance",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    continuityCluster: "arbitration-stabilization",
    roadmapPhase: "phase-d",
    sprintTag: "sprint-1",
    importance: 0.92,
    decayRate: 0.001,
    reliability: 0.95,
    confidence: 0.95,
    visibility: "private",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "seed-cont-08",
    content: "Stabilization: Stability tests require resolving all ties deterministically via cascade checks.",
    category: "Governance",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    continuityCluster: "arbitration-stabilization",
    roadmapPhase: "phase-d",
    sprintTag: "sprint-1",
    importance: 0.90,
    decayRate: 0.002,
    reliability: 0.95,
    confidence: 0.95,
    visibility: "private",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "seed-cont-09",
    content: "Stabilization: The 8-stage tie-break flow is essential to maintain execution stability under high load.",
    category: "Governance",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    continuityCluster: "arbitration-stabilization",
    roadmapPhase: "phase-d",
    sprintTag: "sprint-1",
    importance: 0.88,
    decayRate: 0.003,
    reliability: 0.90,
    confidence: 0.90,
    visibility: "private",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "seed-cont-10",
    content: "Stabilization: Discovered that lexicographical fallback resolves identical score structures during replay tests.",
    category: "Governance",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    continuityCluster: "arbitration-stabilization",
    roadmapPhase: "phase-d",
    sprintTag: "sprint-1",
    importance: 0.86,
    decayRate: 0.004,
    reliability: 0.90,
    confidence: 0.90,
    visibility: "private",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "seed-cont-11",
    content: "Stabilization: Monitored score variance stats to check for sudden ranking changes under pressure.",
    category: "Governance",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    continuityCluster: "arbitration-stabilization",
    roadmapPhase: "phase-d",
    sprintTag: "sprint-1",
    importance: 0.84,
    decayRate: 0.005,
    reliability: 0.90,
    confidence: 0.90,
    visibility: "private",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "seed-cont-12",
    content: "Stabilization: Completed initial replay validation testing with zero variance in final trace outputs.",
    category: "Governance",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    continuityCluster: "arbitration-stabilization",
    roadmapPhase: "phase-d",
    sprintTag: "sprint-1",
    importance: 0.82,
    decayRate: 0.006,
    reliability: 0.90,
    confidence: 0.90,
    visibility: "private",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },

  // Chain C: "Replay Testing" (6 memories)
  {
    id: "seed-cont-13",
    content: "Replay Flow: Configured deterministic replay test suite in context-arbitration tests.",
    category: "Testing",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    continuityCluster: "replay-suite",
    roadmapPhase: "phase-d",
    sprintTag: "sprint-1",
    importance: 0.91,
    decayRate: 0.001,
    reliability: 0.95,
    confidence: 0.95,
    visibility: "private",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "seed-cont-14",
    content: "Replay Flow: Replays must generate consistent regression snapshots from candidate pools.",
    category: "Testing",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    continuityCluster: "replay-suite",
    roadmapPhase: "phase-d",
    sprintTag: "sprint-1",
    importance: 0.89,
    decayRate: 0.002,
    reliability: 0.95,
    confidence: 0.95,
    visibility: "private",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "seed-cont-15",
    content: "Replay Flow: We assert that identical input candidates result in the exact same footprint hash.",
    category: "Testing",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    continuityCluster: "replay-suite",
    roadmapPhase: "phase-d",
    sprintTag: "sprint-1",
    importance: 0.87,
    decayRate: 0.003,
    reliability: 0.90,
    confidence: 0.90,
    visibility: "private",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "seed-cont-16",
    content: "Replay Flow: Replay testing successfully flags scoring formula changes or weighting anomalies.",
    category: "Testing",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    continuityCluster: "replay-suite",
    roadmapPhase: "phase-d",
    sprintTag: "sprint-1",
    importance: 0.85,
    decayRate: 0.004,
    reliability: 0.90,
    confidence: 0.90,
    visibility: "private",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "seed-cont-17",
    content: "Replay Flow: Stability guardrails verify footprint snapshots automatically on staging runs.",
    category: "Testing",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    continuityCluster: "replay-suite",
    roadmapPhase: "phase-d",
    sprintTag: "sprint-1",
    importance: 0.83,
    decayRate: 0.005,
    reliability: 0.90,
    confidence: 0.90,
    visibility: "private",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "seed-cont-18",
    content: "Replay Flow: Asserted that changing even one candidate relevance score breaks the replay hash matches.",
    category: "Testing",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "planning",
    continuityCluster: "replay-suite",
    roadmapPhase: "phase-d",
    sprintTag: "sprint-1",
    importance: 0.81,
    decayRate: 0.006,
    reliability: 0.90,
    confidence: 0.90,
    visibility: "private",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
];

// ─── SECTION 4: TOPIC DRIFT CANDIDATES (20 memories) ──────────────────────────
// Engineering topics not directly related to our active roadmap focus (D1.3/Phase D).
const topicDriftMemories: SeedMemory[] = [
  // Docker (3 memories)
  {
    id: "seed-drift-01",
    content: "Drift Topic: Optimized Docker multi-stage builds to reduce node application image size from 1GB to 120MB.",
    category: "Docker",
    sourceType: "episodic",
    memoryType: "episodic",
    taxonomy: "reflection",
    importance: 0.65,
    decayRate: 0.02,
    reliability: 0.80,
    confidence: 0.80,
    visibility: "private",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },
  {
    id: "seed-drift-02",
    content: "Drift Topic: Docker caching layer improves build step speed significantly in CI/CD pipeline runs.",
    category: "Docker",
    sourceType: "explicit_user",
    memoryType: "reflection",
    taxonomy: "insight",
    importance: 0.60,
    decayRate: 0.03,
    reliability: 0.85,
    confidence: 0.85,
    visibility: "private",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(6),
  },
  {
    id: "seed-drift-03",
    content: "Drift Topic: Configured Docker Compose configurations for local database scaling and replicas replication.",
    category: "Docker",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    importance: 0.55,
    decayRate: 0.04,
    reliability: 0.50,
    confidence: 0.50,
    visibility: "private",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },

  // Postgres (3 memories)
  {
    id: "seed-drift-04",
    content: "Drift Topic: PostgreSQL indexes are critical to optimize query lookup times on large user table schemas.",
    category: "Postgres",
    sourceType: "explicit_user",
    memoryType: "reflection",
    taxonomy: "insight",
    importance: 0.70,
    decayRate: 0.015,
    reliability: 0.90,
    confidence: 0.90,
    visibility: "private",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "seed-drift-05",
    content: "Drift Topic: We noticed table scan bottlenecks in PostgreSQL prior to creating indexes on memoryNode userId.",
    category: "Postgres",
    sourceType: "episodic",
    memoryType: "episodic",
    taxonomy: "reflection",
    importance: 0.68,
    decayRate: 0.02,
    reliability: 0.85,
    confidence: 0.85,
    visibility: "private",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: "seed-drift-06",
    content: "Drift Topic: Explored pg_stat_activity reports to find locked transactions in production databases.",
    category: "Postgres",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    importance: 0.58,
    decayRate: 0.03,
    reliability: 0.60,
    confidence: 0.60,
    visibility: "private",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(9),
  },

  // Redis (3 memories)
  {
    id: "seed-drift-07",
    content: "Drift Topic: Redis cluster pipelining decreases network overhead times by grouping multiple cache writes.",
    category: "Redis",
    sourceType: "roadmap",
    memoryType: "planning",
    taxonomy: "insight",
    importance: 0.75,
    decayRate: 0.012,
    reliability: 0.95,
    confidence: 0.95,
    visibility: "private",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "seed-drift-08",
    content: "Drift Topic: Implemented Redis connection pool limits to prevent socket leak warnings under load.",
    category: "Redis",
    sourceType: "episodic",
    memoryType: "episodic",
    taxonomy: "reflection",
    importance: 0.70,
    decayRate: 0.018,
    reliability: 0.80,
    confidence: 0.80,
    visibility: "private",
    createdAt: daysAgo(7),
    updatedAt: daysAgo(7),
  },
  {
    id: "seed-drift-09",
    content: "Drift Topic: Redis eviction policies like volatile-lru secure memory limits on caching runtimes.",
    category: "Redis",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    importance: 0.62,
    decayRate: 0.025,
    reliability: 0.55,
    confidence: 0.55,
    visibility: "private",
    createdAt: daysAgo(11),
    updatedAt: daysAgo(11),
  },

  // CI/CD (3 memories)
  {
    id: "seed-drift-10",
    content: "Drift Topic: CI/CD runner workflows build node images and trigger unit test runs on commit events.",
    category: "CI/CD",
    sourceType: "explicit_user",
    memoryType: "reflection",
    taxonomy: "reflection",
    importance: 0.64,
    decayRate: 0.022,
    reliability: 0.85,
    confidence: 0.85,
    visibility: "private",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },
  {
    id: "seed-drift-11",
    content: "Drift Topic: Setup caching paths in Github Actions files to save dependency install stages time.",
    category: "CI/CD",
    sourceType: "episodic",
    memoryType: "episodic",
    taxonomy: "reflection",
    importance: 0.59,
    decayRate: 0.028,
    reliability: 0.80,
    confidence: 0.80,
    visibility: "private",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(8),
  },
  {
    id: "seed-drift-12",
    content: "Drift Topic: Automatic security vulnerability dependency checks run in CI pipelines nightly.",
    category: "CI/CD",
    sourceType: "synthetic",
    memoryType: "inferred",
    taxonomy: "inferred",
    importance: 0.50,
    decayRate: 0.04,
    reliability: 0.50,
    confidence: 0.50,
    visibility: "private",
    createdAt: daysAgo(14),
    updatedAt: daysAgo(14),
  },

  // Telemetry (2 memories)
  {
    id: "seed-drift-13",
    content: "Drift Topic: Telemetry metrics compression reduces payload transfer sizes by up to 60%.",
    category: "Telemetry",
    sourceType: "explicit_user",
    memoryType: "reflection",
    taxonomy: "insight",
    importance: 0.68,
    decayRate: 0.016,
    reliability: 0.90,
    confidence: 0.90,
    visibility: "private",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "seed-drift-14",
    content: "Drift Topic: OpenTelemetry spans record execution latency across distributed microservice systems.",
    category: "Telemetry",
    sourceType: "episodic",
    memoryType: "episodic",
    taxonomy: "reflection",
    importance: 0.62,
    decayRate: 0.024,
    reliability: 0.85,
    confidence: 0.85,
    visibility: "private",
    createdAt: daysAgo(7),
    updatedAt: daysAgo(7),
  },

  // Kubernetes (2 memories)
  {
    id: "seed-drift-15",
    content: "Drift Topic: Kubernetes replica deployment strategies ensure high application availability.",
    category: "Kubernetes",
    sourceType: "explicit_user",
    memoryType: "reflection",
    taxonomy: "reflection",
    importance: 0.60,
    decayRate: 0.022,
    reliability: 0.85,
    confidence: 0.85,
    visibility: "private",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: "seed-drift-16",
    content: "Drift Topic: Configured ingress paths in Kubernetes config map files to route HTTP requests.",
    category: "Kubernetes",
    sourceType: "episodic",
    memoryType: "episodic",
    taxonomy: "reflection",
    importance: 0.56,
    decayRate: 0.032,
    reliability: 0.80,
    confidence: 0.80,
    visibility: "private",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(9),
  },

  // Vector Indexing (2 memories)
  {
    id: "seed-drift-17",
    content: "Drift Topic: Vector indexing using HNSW parameters provides fast approximate nearest neighbor lookups.",
    category: "Vector",
    sourceType: "explicit_user",
    memoryType: "reflection",
    taxonomy: "insight",
    importance: 0.72,
    decayRate: 0.015,
    reliability: 0.90,
    confidence: 0.90,
    visibility: "private",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },
  {
    id: "seed-drift-18",
    content: "Drift Topic: Inverted file index with product quantization optimizes memory storage requirements for vectors.",
    category: "Vector",
    sourceType: "episodic",
    memoryType: "episodic",
    taxonomy: "reflection",
    importance: 0.64,
    decayRate: 0.025,
    reliability: 0.80,
    confidence: 0.80,
    visibility: "private",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(6),
  },

  // Infra Caching (2 memories)
  {
    id: "seed-drift-19",
    content: "Drift Topic: Infrastructure caching layer decorator intercepts database reads to prevent network latency.",
    category: "Cache",
    sourceType: "explicit_user",
    memoryType: "reflection",
    taxonomy: "insight",
    importance: 0.70,
    decayRate: 0.012,
    reliability: 0.90,
    confidence: 0.90,
    visibility: "private",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "seed-drift-20",
    content: "Drift Topic: Browser session storage cache maintains frontend layout structures during page transitions.",
    category: "Cache",
    sourceType: "episodic",
    memoryType: "episodic",
    taxonomy: "reflection",
    importance: 0.58,
    decayRate: 0.03,
    reliability: 0.80,
    confidence: 0.80,
    visibility: "private",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(8),
  },
];

// ─── SECTION 5: EXPLICIT SOURCE HIERARCHY SYSTEM ANCHORS & USER MEMORIES ──────
// Explicit, highly reliable system anchors and user facts that should dominate.
const trustEcosystemMemories: SeedMemory[] = [
  // System Anchors (highest trust, sourceType = "system", priority = 1.0)
  {
    id: "seed-sys-01",
    content: "System Rule: A bounded attention context limits maximum staged candidates to 20 nodes.",
    category: "Architecture",
    sourceType: "system",
    memoryType: "anchor",
    taxonomy: "anchor",
    protectedAnchor: true,
    importance: 1.0,
    decayRate: 0.001,
    reliability: 1.0,
    confidence: 1.0,
    visibility: "private",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "seed-sys-02",
    content: "System Rule: TokenBudgetEngine calculates dynamic allocation percentages to prevent context overflow.",
    category: "Architecture",
    sourceType: "system",
    memoryType: "anchor",
    taxonomy: "anchor",
    protectedAnchor: true,
    importance: 1.0,
    decayRate: 0.001,
    reliability: 1.0,
    confidence: 1.0,
    visibility: "private",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "seed-sys-03",
    content: "System Rule: ContextDiversityEngine caps duplicate density per taxonomy to balance information.",
    category: "Architecture",
    sourceType: "system",
    memoryType: "anchor",
    taxonomy: "anchor",
    protectedAnchor: true,
    importance: 0.98,
    decayRate: 0.001,
    reliability: 1.0,
    confidence: 1.0,
    visibility: "private",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "seed-sys-04",
    content: "System Rule: ContextAssemblyEngine packages candidates in top-down hierarchy layers.",
    category: "Architecture",
    sourceType: "system",
    memoryType: "anchor",
    taxonomy: "anchor",
    protectedAnchor: true,
    importance: 0.98,
    decayRate: 0.001,
    reliability: 1.0,
    confidence: 1.0,
    visibility: "private",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },
  {
    id: "seed-sys-05",
    content: "System Rule: ArbitrationStabilityGuardrails alerts if continuity dominance ratio exceeds 80%.",
    category: "Architecture",
    sourceType: "system",
    memoryType: "anchor",
    taxonomy: "anchor",
    protectedAnchor: true,
    importance: 0.98,
    decayRate: 0.001,
    reliability: 1.0,
    confidence: 1.0,
    visibility: "private",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },

  // Explicit User Facts (strong trust, sourceType = "explicit_user", priority = 0.8)
  {
    id: "seed-user-01",
    content: "User Fact: I prefer dark theme accent lavender and always disable calendar notifications.",
    category: "Profile",
    sourceType: "explicit_user",
    memoryType: "planning",
    taxonomy: "insight",
    importance: 0.90,
    decayRate: 0.002,
    reliability: 1.0,
    confidence: 1.0,
    visibility: "private",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "seed-user-02",
    content: "User Fact: My prime productivity hours are early mornings between 08:00 and 11:00 AM.",
    category: "Profile",
    sourceType: "explicit_user",
    memoryType: "planning",
    taxonomy: "insight",
    importance: 0.90,
    decayRate: 0.002,
    reliability: 1.0,
    confidence: 1.0,
    visibility: "private",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },
  {
    id: "seed-user-03",
    content: "User Fact: Current skripsi project revolves around cognitive computing and AI-assisted productivity.",
    category: "Academics",
    sourceType: "explicit_user",
    memoryType: "planning",
    taxonomy: "insight",
    importance: 0.88,
    decayRate: 0.003,
    reliability: 1.0,
    confidence: 1.0,
    visibility: "private",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(6),
  },
  {
    id: "seed-user-04",
    content: "User Fact: I run workout recovery routines jogging and stretching morning times to restore focus.",
    category: "Health",
    sourceType: "explicit_user",
    memoryType: "planning",
    taxonomy: "insight",
    importance: 0.86,
    decayRate: 0.004,
    reliability: 1.0,
    confidence: 1.0,
    visibility: "private",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(8),
  },
  {
    id: "seed-user-05",
    content: "User Fact: My database assignment ER normalisation deadline is due tomorrow evening.",
    category: "Academics",
    sourceType: "explicit_user",
    memoryType: "planning",
    taxonomy: "insight",
    importance: 0.85,
    decayRate: 0.005,
    reliability: 1.0,
    confidence: 1.0,
    visibility: "private",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },
];

// ─── Aggregate All Seed Data ────────────────────────────────────────────────

const allMemories: SeedMemory[] = [
  ...duplicateClusterMemories,
  ...syntheticInferenceMemories,
  ...continuityChainMemories,
  ...topicDriftMemories,
  ...trustEcosystemMemories,
];

// ─── Main Seed Function ─────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  SOPHIA Cognition Runtime — Memory Seed Script (D1.3)");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Total entries to seed: ${allMemories.length}`);
  console.log("");

  const devUserId = process.env.DEV_USER_ID || "cmpmrvs6q0000u3jw6rvj83jg";
  const devEmail = "user@sophia.local";
  const devName = "Sophia Dev";

  // 1. Ensure dev user exists
  const user = await prisma.user.upsert({
    where: { id: devUserId },
    update: {
      email: devEmail,
      name: devName,
    },
    create: {
      id: devUserId,
      email: devEmail,
      name: devName,
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
  const sourceTypeStats: Record<string, number> = {};

  for (const mem of allMemories) {
    const hash = computeContentHash(mem.content);

    // Idempotency: skip if static ID already exists
    const existing = await prisma.memoryNode.findUnique({
      where: { id: mem.id },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Build tags array
    const dbTags: string[] = [];
    if (mem.sprintTag) dbTags.push(`sprint:${mem.sprintTag}`);
    if (mem.roadmapPhase) dbTags.push(`phase:${mem.roadmapPhase}`);
    if (mem.continuityCluster) dbTags.push(`cluster:${mem.continuityCluster}`);
    if (mem.protectedAnchor) dbTags.push("protected:true");
    if (mem.confidence !== undefined) dbTags.push(`confidence:${mem.confidence}`);
    if (mem.tags) {
      mem.tags.forEach(t => {
        if (!dbTags.includes(t)) dbTags.push(t);
      });
    }

    // Map memoryType cleanly
    let dbMemoryType = "semantic";
    if (mem.memoryType === "episodic" || mem.memoryType === "inferred") {
      dbMemoryType = "episodic";
    }

    await prisma.memoryNode.create({
      data: {
        id: mem.id,
        content: mem.content,
        category: mem.category || "General",
        tags: dbTags,
        importance: mem.importance ?? 1.0,
        decayRate: mem.decayRate ?? 0.01,
        sourceType: mem.sourceType,
        visibility: mem.visibility || "private",
        taxonomy: mem.taxonomy || "reflection",
        contentHash: hash,
        reliability: mem.reliability ?? 1.0,
        memoryType: dbMemoryType,
        userId: user.id,
        createdAt: mem.createdAt,
      },
    });

    created++;
    const cat = mem.category || "General";
    const tax = mem.taxonomy || "reflection";
    categoryStats[cat] = (categoryStats[cat] || 0) + 1;
    taxonomyStats[tax] = (taxonomyStats[tax] || 0) + 1;
    sourceTypeStats[mem.sourceType] = (sourceTypeStats[mem.sourceType] || 0) + 1;
  }

  // 4. Print summary report
  console.log("");
  console.log("─── Seed Results ──────────────────────────────────────────");
  console.log(`  Created: ${created}`);
  console.log(`  Skipped (idempotent): ${skipped}`);
  console.log(`  Total in dataset: ${allMemories.length}`);
  console.log("");

  // 5. Verify total memory count
  const totalMemories = await prisma.memoryNode.count({
    where: { userId: user.id },
  });
  console.log(`─── Database Verification ─────────────────────────────────`);
  console.log(`  Total MemoryNodes for user: ${totalMemories}`);
  console.log("");

  // ─── SECTION 9: RUNTIME VALIDATION SCENARIOS ───────────────────────────────
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Executing D1.3 Runtime Stabilization Validation Scenario");
  console.log("═══════════════════════════════════════════════════════════");
  
  // Map our SeedMemory entities into mock RetrievalCandidate records for testing
  const mockCandidates: RetrievalCandidate[] = allMemories.map(m => {
    return {
      id: m.id,
      content: m.content,
      category: m.category || "General",
      sourceType: m.sourceType,
      taxonomy: m.taxonomy || "reflection",
      relevanceScore: 80, // Simulated relevance
      decayedImportance: m.importance ?? 0.90, // Simulated decayed relevance
      combinedScore: 0,
      traceReason: "Mock Seed Staging",
      sprintTag: m.sprintTag,
      roadmapPhase: m.roadmapPhase,
      continuityCluster: m.continuityCluster,
      protectedAnchor: m.protectedAnchor,
      confidence: m.confidence ?? m.reliability ?? 0.8,
      reliability: m.reliability ?? 1.0,
      importance: m.importance ?? 1.0,
      decayRate: m.decayRate ?? 0.01
    };
  });

  let failureCount = 0;

  // Scenario 1: Continuity Persistence
  console.log("\n  [Scenario 1: Continuity Persistence]");
  const actResult1 = RetrievalArbitrationHooks.arbitrate(mockCandidates, {
    sessionId: "chat_session_default",
    activeTopic: "Retrieval"
  });
  const selectedIds = actResult1.candidates
    .filter(c => c.arbitrationTrace?.selectionDecision === 'selected')
    .map(c => c.id);
  const hasContinuity = selectedIds.some(id => id.includes("seed-cont-"));
  if (hasContinuity) {
    console.log("    - Continuity candidates in selection: ✓ YES");
  } else {
    console.log("    - Continuity candidates in selection: ❌ NO");
    failureCount++;
  }

  // Scenario 2: Duplicate Suppression Stability
  console.log("\n  [Scenario 2: Duplicate Suppression Stability]");
  const actResultDup = RetrievalArbitrationHooks.arbitrate(mockCandidates, {
    sessionId: "chat_session_default",
    activeTopic: "None"
  });
  const dupTraces = actResultDup.traces.filter(t => t.candidateId.startsWith("seed-dup-"));
  const penalizedDups = dupTraces.filter(t => t.duplicatePenalty > 0);
  const protectedDups = dupTraces.filter(t => 
    t.candidateId === "seed-dup-01" || 
    t.candidateId === "seed-dup-06" || 
    t.candidateId === "seed-dup-11" || 
    t.candidateId === "seed-dup-16"
  );
  const allProtectedSurvive = protectedDups.every(t => t.duplicatePenalty === 0 && t.selectionDecision === 'selected');
  console.log(`    - Penalized duplicate count: ${penalizedDups.length}/${dupTraces.length - 4}`);
  console.log(`    - Protected anchors exempt from penalty: ${allProtectedSurvive ? "✓ YES" : "❌ NO"}`);
  if (allProtectedSurvive && penalizedDups.length > 0) {
    console.log("    - Duplicate suppression stability test: ✓ PASS");
  } else {
    console.log("    - Duplicate suppression stability test: ❌ FAIL");
    failureCount++;
  }

  // Scenario 3: Drift Replay Validation
  console.log("\n  [Scenario 3: Drift Replay and Determinism Validation]");
  const actResultReplay1 = RetrievalArbitrationHooks.arbitrate(mockCandidates, {
    sessionId: "chat_session_default",
    activeTopic: "Retrieval"
  });
  const actResultReplay2 = RetrievalArbitrationHooks.arbitrate(mockCandidates, {
    sessionId: "chat_session_default",
    activeTopic: "Retrieval"
  });
  const replayMatch = actResultReplay1.guardrails.regressionSnapshot === actResultReplay2.guardrails.regressionSnapshot;
  console.log(`    - Deterministic snapshot replay match: ${replayMatch ? "✓ YES" : "❌ NO"}`);
  if (replayMatch) {
    console.log("    - Replay snapshot validation: ✓ PASS");
  } else {
    console.log("    - Replay snapshot validation: ❌ FAIL");
    failureCount++;
  }

  // Scenario 4: Diversity Health
  console.log("\n  [Scenario 4: Diversity Health]");
  const categories = actResult1.candidates
    .filter(c => c.arbitrationTrace?.selectionDecision === 'selected')
    .map(c => c.category);
  const categoryCounts: Record<string, number> = {};
  categories.forEach(c => { categoryCounts[c] = (categoryCounts[c] || 0) + 1; });
  const totalSelected = categories.length;
  let dominantCategoryExists = false;
  for (const cat in categoryCounts) {
    const ratio = categoryCounts[cat] / totalSelected;
    if (ratio > 0.80) dominantCategoryExists = true;
  }
  console.log(`    - Diverse category selection: ${!dominantCategoryExists ? "✓ YES" : "❌ NO"}`);
  if (!dominantCategoryExists) {
    console.log("    - Diversity health test: ✓ PASS");
  } else {
    console.log("    - Diversity health test: ❌ FAIL (A single category dominated >80%)");
    failureCount++;
  }

  // Scenario 5: Source Priority Validation
  console.log("\n  [Scenario 5: Source Priority Validation]");
  const sysTraces = actResult1.traces.filter(t => t.candidateId.startsWith("seed-sys-"));
  const synthTraces = actResult1.traces.filter(t => t.candidateId.startsWith("seed-synth-"));
  const minSysScore = Math.min(...sysTraces.map(t => t.finalScore));
  const maxSynthScore = Math.max(...synthTraces.map(t => t.finalScore));
  const priorityOk = minSysScore > maxSynthScore;
  console.log(`    - System anchors outrank low-trust synthetics: ${priorityOk ? "✓ YES" : "❌ NO"} (min sys: ${minSysScore.toFixed(3)}, max synth: ${maxSynthScore.toFixed(3)})`);
  if (priorityOk) {
    console.log("    - Source trust prioritization: ✓ PASS");
  } else {
    console.log("    - Source trust prioritization: ❌ FAIL");
    failureCount++;
  }

  // Scenario 6: Latency Stability
  console.log("\n  [Scenario 6: Latency Stability]");
  const start = performance.now();
  RetrievalArbitrationHooks.arbitrate(mockCandidates, {
    sessionId: "chat_session_default",
    activeTopic: "Retrieval"
  });
  const latencyMs = performance.now() - start;
  const latencyOk = latencyMs < 50;
  console.log(`    - Arbitration execution time: ${latencyMs.toFixed(2)}ms (<50ms): ${latencyOk ? "✓ YES" : "❌ NO"}`);
  if (latencyOk) {
    console.log("    - Latency safety checks: ✓ PASS");
  } else {
    console.log("    - Latency safety checks: ❌ FAIL");
    failureCount++;
  }

  // Scenario 7: Continuity Lock Detection
  console.log("\n  [Scenario 7: Continuity Lock Detection]");
  const actResultLock = RetrievalArbitrationHooks.arbitrate(mockCandidates, {
    sessionId: "chat_session_default",
    activeTopic: "Docker"
  });
  const selectedDriftIds = actResultLock.candidates
    .filter(c => c.arbitrationTrace?.selectionDecision === 'selected')
    .map(c => c.id)
    .filter(id => id.startsWith("seed-drift-"));
  const driftSelected = selectedDriftIds.length > 0;
  console.log(`    - Cognitive pivot (drift candidate selected): ${driftSelected ? "✓ YES" : "❌ NO"}`);
  if (driftSelected) {
    console.log("    - Continuity lock avoidance: ✓ PASS");
  } else {
    console.log("    - Continuity lock avoidance: ❌ FAIL");
    failureCount++;
  }

  // Scenario 8: Guardrail Telemetry Validation
  console.log("\n  [Scenario 8: Guardrail Telemetry Validation]");
  const guardrails = actResult1.guardrails;
  const telemetryOk = guardrails.scoreMean > 0 && guardrails.scoreVariance > 0 && guardrails.regressionSnapshot !== "ar_snap_empty";
  console.log(`    - Guardrail metrics populated: ${telemetryOk ? "✓ YES" : "❌ NO"}`);
  console.log(`      - Score Mean: ${guardrails.scoreMean}`);
  console.log(`      - Score Variance: ${guardrails.scoreVariance}`);
  console.log(`      - Continuity Dominance Ratio: ${(guardrails.continuityDominanceRatio * 100).toFixed(1)}%`);
  console.log(`      - Regression Snapshot: ${guardrails.regressionSnapshot}`);
  if (telemetryOk) {
    console.log("    - Guardrail telemetry validation: ✓ PASS");
  } else {
    console.log("    - Guardrail telemetry validation: ❌ FAIL");
    failureCount++;
  }

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  if (failureCount === 0) {
    console.log("  ✓ Validation Success. All 8 scenarios passed!");
  } else {
    console.error(`  ❌ Validation Failure. ${failureCount} scenarios failed!`);
    process.exit(1);
  }
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
