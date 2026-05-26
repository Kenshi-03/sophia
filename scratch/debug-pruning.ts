import { TokenBudgetEngine } from "../lib/ai/working-memory/budget";
import { RetrievalCandidate } from "../lib/ai/working-memory/types";

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

const result = TokenBudgetEngine.pruneRetrievalCandidates(
  [highValCandidate, midValCandidate, lowValCandidate],
  45
);

console.log("Accepted:", result.accepted.map(c => c.id));
console.log("Pruning Trace:", result.pruningTrace);
console.log("Pressure Level:", result.budgetPressureLevel);
console.log("Overflow Severity:", result.overflowSeverity);
