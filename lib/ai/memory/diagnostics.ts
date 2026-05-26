import prisma from "../../db/prisma";
import { calculateDecayedImportance } from "./decay-manager";
import { getEmbedding } from "./embedding";
import { searchSimilarMemories } from "./similarity";
import { getRelatedContexts } from "./relationship-engine";

export interface DiagnosticsRecord {
  memoryId: string;
  content: string;
  category: string;
  taxonomy: string;
  visibility: string;
  baseImportance: number;
  decayedImportance: number;
  reliability: number;
  recencyWeight: number;
  taxonomyWeight: number;
  similarityScore: number;
  combinedScore: number;
  isAllowedByPrivacy: boolean;
  retrievalStatus: "selected" | "discarded_low_score" | "discarded_mmr_redundancy" | "discarded_budget_cap" | "filtered_privacy";
  mmrRedundancyPenalty?: number;
}

export async function getRetrievalDiagnostics(
  userId: string,
  query: string,
  privacyScope: string = "private",
  characterBudget: number = 8000
) {
  const diagnostics: DiagnosticsRecord[] = [];
  let queryEmbedding: number[] | null = null;
  let embeddingRetrievalLatency = 0;
  
  const startEmbed = Date.now();
  try {
    queryEmbedding = await getEmbedding(query, userId);
    embeddingRetrievalLatency = Date.now() - startEmbed;
  } catch (err) {
    // Graceful error
  }

  // 1. Fetch candidates
  let vectorResults: any[] = [];
  if (queryEmbedding) {
    vectorResults = await searchSimilarMemories(userId, queryEmbedding, 50, 0.0); // fetch all for tracing
  }

  const allDbNodes = await prisma.memoryNode.findMany({
    where: { userId },
  });

  const levels: Record<string, number> = {
    'shareable': 1,
    'restricted': 2,
    'ai-only': 3,
    'private': 4,
  };
  const scopeVal = levels[privacyScope] || 4;

  const resultsMap = new Map<string, number>();
  vectorResults.forEach(r => resultsMap.set(r.node.id, r.similarityScore));

  const scoredList = allDbNodes.map((row) => {
    const similarityScore = resultsMap.has(row.id) ? resultsMap.get(row.id)! : 0.0;
    const baseImportance = row.importance ?? 1.0;
    
    // Decayed importance
    const createdTime = row.createdAt ? new Date(row.createdAt).getTime() : Date.now();
    const daysPassed = (Date.now() - createdTime) / (1000 * 3600 * 24);
    const decayedImportance = baseImportance * Math.exp(-(row.decayRate ?? 0.01) * daysPassed);
    
    // Taxonomy multiplier
    let taxonomyWeight = 1.0;
    switch (row.taxonomy) {
      case "insight": taxonomyWeight = 1.3; break;
      case "stress-marker": taxonomyWeight = 1.25; break;
      case "deep-work-session": taxonomyWeight = 1.2; break;
      case "recovery-event": taxonomyWeight = 1.15; break;
      case "planning": taxonomyWeight = 1.1; break;
      case "reflection": taxonomyWeight = 1.0; break;
    }

    // Recency bias
    const recencyWeight = 1.0 / (1.0 + (daysPassed * 0.015));
    const reliability = row.reliability ?? 1.0;
    
    const combinedScore = similarityScore * decayedImportance * taxonomyWeight * reliability * recencyWeight;
    const isAllowedByPrivacy = (levels[row.visibility || "private"] || 4) <= scopeVal;

    return {
      row,
      baseImportance,
      decayedImportance,
      taxonomyWeight,
      recencyWeight,
      reliability,
      similarityScore,
      combinedScore,
      isAllowedByPrivacy,
    };
  });

  // Sort by combinedScore descending
  scoredList.sort((a, b) => b.combinedScore - a.combinedScore);

  // Apply visibility and MMR tracking
  const selectedIds: string[] = [];
  const memoriesBudget = Math.floor(characterBudget * 0.5);
  let currentLength = 0;

  for (const item of scoredList) {
    let status: DiagnosticsRecord["retrievalStatus"] = "discarded_low_score";
    
    if (!item.isAllowedByPrivacy) {
      status = "filtered_privacy";
    } else if (item.combinedScore < 0.05) {
      status = "discarded_low_score";
    } else {
      // Evaluate redundancy check
      let maxOverlap = 0;
      for (const selId of selectedIds) {
        const selNode = allDbNodes.find(n => n.id === selId);
        if (selNode) {
          // simple overlap comparison
          const w1 = new Set(item.row.content.toLowerCase().split(/\s+/));
          const w2 = new Set(selNode.content.toLowerCase().split(/\s+/));
          let matches = 0;
          w1.forEach(w => { if (w2.has(w)) matches++; });
          const overlap = matches / Math.min(w1.size, w2.size || 1);
          if (overlap > maxOverlap) maxOverlap = overlap;
        }
      }

      if (maxOverlap > 0.6) {
        status = "discarded_mmr_redundancy";
      } else if (currentLength + item.row.content.length > memoriesBudget) {
        status = "discarded_budget_cap";
      } else {
        status = "selected";
        selectedIds.push(item.row.id);
        currentLength += item.row.content.length;
      }
    }

    diagnostics.push({
      memoryId: item.row.id,
      content: item.row.content,
      category: item.row.category,
      taxonomy: item.row.taxonomy || "reflection",
      visibility: item.row.visibility || "private",
      baseImportance: Number(item.baseImportance.toFixed(3)),
      decayedImportance: Number(item.decayedImportance.toFixed(3)),
      reliability: Number(item.reliability.toFixed(3)),
      recencyWeight: Number(item.recencyWeight.toFixed(3)),
      taxonomyWeight: Number(item.taxonomyWeight.toFixed(3)),
      similarityScore: Number(item.similarityScore.toFixed(3)),
      combinedScore: Number(item.combinedScore.toFixed(4)),
      isAllowedByPrivacy: item.isAllowedByPrivacy,
      retrievalStatus: status,
    });
  }

  // Load relation trace and profile summary
  const profile = await prisma.cognitiveProfile.findUnique({ where: { userId } });
  const selectedNodes = allDbNodes.filter(n => selectedIds.includes(n.id));
  const relationsTrace = [];

  for (const node of selectedNodes) {
    const rels = await getRelatedContexts(userId, node.id, "memory");
    for (const r of rels) {
      relationsTrace.push({
        sourceMemoryId: node.id,
        targetType: r.type,
        targetTitle: r.data.title || r.data.content,
        relationType: r.relation.relationType,
        strength: r.relation.relationStrength,
        confidence: r.relation.relationConfidence,
      });
    }
  }

  return {
    query,
    embeddingRetrievalLatencyMs: embeddingRetrievalLatency,
    characterBudget,
    memoriesBudget,
    currentMemoriesLength: currentLength,
    privacyScope,
    profileSummary: profile ? {
      overloadTolerance: profile.overloadTolerance,
      recoveryQuality: profile.recoveryQuality,
      productivityConsistency: profile.productivityConsistency,
    } : null,
    relationsTrace,
    diagnostics,
  };
}
