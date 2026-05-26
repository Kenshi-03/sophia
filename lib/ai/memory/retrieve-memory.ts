import prisma from "../../db/prisma";
import { MemoryNode } from "@/types/memory";
import { getEmbedding } from "./embedding";
import { searchSimilarMemories } from "./similarity";
import { calculateDecayedImportance } from "./decay-manager";
import { getRelatedContexts } from "./relationship-engine";
import { logger } from "../../logger";
import { RetrievalCandidate, RetrievalSourceType } from "../working-memory/types";

/**
 * Map MemoryNode to RetrievalCandidate DTO cleanly and deterministically.
 */
function mapToRetrievalCandidate(
  node: MemoryNode,
  relevanceScore: number,
  decayedImportance: number,
  combinedScore: number,
  traceReason: string = "Semantic Retrieval"
): RetrievalCandidate {
  let sourceType: RetrievalSourceType = "semantic_memory";
  if (node.memoryType === "episodic") {
    sourceType = "episodic_memory";
  } else if (node.sourceType === "task") {
    sourceType = "task";
  }

  return {
    id: node.id,
    content: node.content,
    category: node.category,
    sourceType,
    taxonomy: node.taxonomy || "reflection",
    relevanceScore,
    decayedImportance,
    combinedScore,
    traceReason,
  };
}

/**
 * Checks if the visibility level of the memory node is permitted under the requested privacy scope.
 * Levels: shareable (1) < restricted (2) < ai-only (3) < private (4)
 */
function isAllowedVisibility(nodeVisibility: string, privacyScope: string): boolean {
  const levels: Record<string, number> = {
    'shareable': 1,
    'restricted': 2,
    'ai-only': 3,
    'private': 4,
  };
  const nodeVal = levels[nodeVisibility] || 4;
  const scopeVal = levels[privacyScope] || 4;
  return nodeVal <= scopeVal;
}

/**
 * Calculates overlap coefficient between two texts as a fallback similarity metric.
 */
function wordOverlapSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  if (words1.size === 0 || words2.size === 0) return 0;
  
  let intersection = 0;
  words1.forEach(w => {
    if (words2.has(w)) intersection++;
  });
  
  return intersection / Math.min(words1.size, words2.size);
}

/**
 * Computes cosine similarity between two numeric vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function retrieveRelevantMemories(
  userId: string,
  query: string,
  characterBudget: number = 8000,
  privacyScope: string = "private"
): Promise<RetrievalCandidate[]> {
  try {
    let candidateNodes: RetrievalCandidate[] = [];
    const embeddingMap = new Map<string, number[]>();

    const queryTrim = query.trim();

    if (!queryTrim) {
      // 1. If empty query, retrieve recent memories directly
      const allNodes = await prisma.memoryNode.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

      // Filter by privacy first
      const allowedNodes = allNodes.filter((row) =>
        isAllowedVisibility(row.visibility || "private", privacyScope)
      );

      candidateNodes = allowedNodes.map((row) => {
        const node = {
          id: row.id,
          content: row.content,
          category: row.category,
          tags: row.tags || [],
          importance: Number(row.importance),
          decayRate: Number(row.decayRate),
          sourceType: row.sourceType,
          visibility: row.visibility,
          taxonomy: row.taxonomy,
          contentHash: row.contentHash,
          reliability: Number(row.reliability),
          memoryType: row.memoryType,
          userId: row.userId,
          createdAt: row.createdAt,
        } as unknown as MemoryNode;

        const decayedImportance = calculateDecayedImportance(node);
        return mapToRetrievalCandidate(
          node,
          0,
          decayedImportance,
          decayedImportance,
          "Recent Memory Staging"
        );
      });
    } else {
      // 2. Query has text. Attempt semantic similarity vector search
      let vectorResults: any[] = [];
      let queryVector: number[] | null = null;

      try {
        queryVector = await getEmbedding(queryTrim, userId);
        if (queryVector && queryVector.length === 768) {
          vectorResults = await searchSimilarMemories(userId, queryVector, 30, 0.25);
        }
      } catch (err) {
        logger.warn("Graceful degradation: Semantic search failed, falling back to keyword search", { error: String(err) });
      }

      if (vectorResults.length > 0) {
        // Load vector embeddings of candidates for diversity calculation
        const candidateIds = vectorResults.map((v) => v.node.id);
        const rawEmbeddings = await prisma.$queryRawUnsafe<Array<{ memoryNodeId: string; embedding: string }>>(
          `SELECT "memoryNodeId", "embedding"::text FROM "MemoryEmbedding" WHERE "memoryNodeId" IN (${candidateIds.map(id => `'${id}'`).join(",")})`
        );
        rawEmbeddings.forEach((row) => {
          const vecStr = row.embedding;
          const vec = vecStr.replace(/[\[\]]/g, "").split(",").map(Number);
          if (vec.length === 768) {
            embeddingMap.set(row.memoryNodeId, vec);
          }
        });

        // Filter by privacy first
        const allowedVectorResults = vectorResults.filter((res) =>
          isAllowedVisibility(res.node.visibility || "private", privacyScope)
        );

        // Map vector results and calculate combined scores
        candidateNodes = allowedVectorResults.map((res) => {
          const node = res.node as MemoryNode;
          const similarity = res.similarityScore;
          const decayedImportance = calculateDecayedImportance(node);

          // Taxonomy multipliers
          let taxonomyWeight = 1.0;
          switch (node.taxonomy) {
            case "insight": taxonomyWeight = 1.3; break;
            case "stress-marker": taxonomyWeight = 1.25; break;
            case "deep-work-session": taxonomyWeight = 1.2; break;
            case "recovery-event": taxonomyWeight = 1.15; break;
            case "planning": taxonomyWeight = 1.1; break;
            case "reflection": taxonomyWeight = 1.0; break;
          }

          // Recency bias (prioritize recent behaviors gently)
          const createdTime = node.createdAt ? new Date(node.createdAt).getTime() : Date.now();
          const daysPassed = (Date.now() - createdTime) / (1000 * 3600 * 24);
          const recencyWeight = 1.0 / (1.0 + (daysPassed * 0.015));

          const reliability = node.reliability ?? 1.0;
          const combinedScore = similarity * decayedImportance * taxonomyWeight * reliability * recencyWeight;

          return mapToRetrievalCandidate(
            node,
            Math.round(similarity * 100),
            decayedImportance,
            combinedScore,
            "Semantic Retrieval"
          );
        });
      } else {
        // Fallback: Word overlap keyword matching
        const allNodes = await prisma.memoryNode.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });

        // Filter by privacy first
        const allowedFallbackNodes = allNodes.filter((row) =>
          isAllowedVisibility(row.visibility || "private", privacyScope)
        );

        const queryWords = queryTrim.toLowerCase().split(/\s+/).filter((w) => w.length > 0);

        candidateNodes = allowedFallbackNodes
          .map((row) => {
            const node = {
              id: row.id,
              content: row.content,
              category: row.category,
              tags: row.tags || [],
              importance: Number(row.importance),
              decayRate: Number(row.decayRate),
              sourceType: row.sourceType,
              visibility: row.visibility,
              taxonomy: row.taxonomy,
              contentHash: row.contentHash,
              reliability: Number(row.reliability),
              memoryType: row.memoryType,
              userId: row.userId,
              createdAt: row.createdAt,
            } as unknown as MemoryNode;

            let matchCount = 0;
            const contentLower = node.content.toLowerCase();
            queryWords.forEach((word) => {
              if (contentLower.includes(word)) matchCount++;
            });

            const similarity = queryWords.length > 0 ? (matchCount / queryWords.length) : 0;
            const decayedImportance = calculateDecayedImportance(node);
            const combinedScore = similarity * decayedImportance * (node.reliability ?? 1.0);

            return mapToRetrievalCandidate(
              node,
              Math.round(similarity * 100),
              decayedImportance,
              combinedScore,
              "Keyword Match Staging"
            );
          })
          .filter((n) => n.combinedScore > 0);
      }
    }

    // Sort by combined score descending
    candidateNodes.sort((a, b) => b.combinedScore - a.combinedScore);

    // 4. Maximal Marginal Relevance (MMR) Diversity Loop
    const selectedMemories: RetrievalCandidate[] = [];
    const lambda = 0.65; // balance relevance and novelty
    const memoriesBudget = Math.floor(characterBudget * 0.5); // 50% allocation for memories

    let currentLength = 0;

    while (candidateNodes.length > 0 && currentLength < memoriesBudget) {
      let bestIndex = -1;
      let bestMMRScore = -Infinity;

      for (let i = 0; i < candidateNodes.length; i++) {
        const candidate = candidateNodes[i];
        let maxSimilarity = 0;

        for (const selected of selectedMemories) {
          const vecA = embeddingMap.get(candidate.id);
          const vecB = embeddingMap.get(selected.id);
          let sim = 0;
          if (vecA && vecB) {
            sim = cosineSimilarity(vecA, vecB);
          } else {
            sim = wordOverlapSimilarity(candidate.content, selected.content);
          }
          if (sim > maxSimilarity) {
            maxSimilarity = sim;
          }
        }

        // MMR: lambda * relevance_score - (1 - lambda) * redundancy
        const mmrScore = lambda * candidate.combinedScore - (1 - lambda) * maxSimilarity;
        if (mmrScore > bestMMRScore) {
          bestMMRScore = mmrScore;
          bestIndex = i;
        }
      }

      if (bestIndex === -1) break;

      const selectedNode = candidateNodes[bestIndex];
      const nodeLength = selectedNode.content.length;

      if (currentLength + nodeLength > memoriesBudget) {
        break; // Stop to preserve budget
      }

      selectedMemories.push(selectedNode);
      currentLength += nodeLength;
      candidateNodes.splice(bestIndex, 1);
    }

    // 5. Context Budget Allocator: Append synthetic nodes for Behavioral Trends & Graph Relations
    const resultContextNodes: RetrievalCandidate[] = [...selectedMemories];

    // Fetch and format relationship connections (up to 30% budget)
    const relationsBudget = Math.floor(characterBudget * 0.3);
    const relatedContextText: string[] = [];
    let relationLengthAccumulator = 0;

    for (const mem of selectedMemories) {
      const connections = await getRelatedContexts(userId, mem.id, "memory");
      for (const conn of connections) {
        let typeLabel = "Item";
        if (conn.type === "task") typeLabel = "Tugas";
        else if (conn.type === "event") typeLabel = "Event/Agenda";
        else if (conn.type === "memory") typeLabel = "Memori Terkait";

        const text = `- ${typeLabel}: "${conn.data.title || conn.data.content}" (${conn.relation.relationType}, confidence: ${conn.relation.relationConfidence})`;
        if (relationLengthAccumulator + text.length <= relationsBudget && !relatedContextText.includes(text)) {
          relatedContextText.push(text);
          relationLengthAccumulator += text.length;
        }
      }
    }

    if (relatedContextText.length > 0) {
      resultContextNodes.push({
        id: "synthetic-relations-node",
        content: `Relasi Konteks Terkait:\n${relatedContextText.join("\n")}`,
        category: "Semantic Relations",
        sourceType: "relationship_link",
        taxonomy: "reflection",
        relevanceScore: 100,
        decayedImportance: 1.0,
        combinedScore: 1.0,
        traceReason: "System Generated Relations",
      });
    }

    // Fetch and format user Cognitive Profile (up to 20% budget)
    const profileBudget = Math.floor(characterBudget * 0.2);
    try {
      const profile = await prisma.cognitiveProfile.findUnique({
        where: { userId },
      });

      if (profile) {
        let profileText = `Profil Kognitif Pengguna:\n`;
        profileText += `- Toleransi Overload: ${profile.overloadTolerance}%\n`;
        profileText += `- Kualitas Pemulihan: ${profile.recoveryQuality}%\n`;
        profileText += `- Konsistensi Produktivitas: ${profile.productivityConsistency}%\n`;
        if (profile.deepWorkTiming) {
          profileText += `- Waktu Kerja Mendalam: ${profile.deepWorkTiming}\n`;
        }

        if (profileText.length <= profileBudget) {
          resultContextNodes.push({
            id: "synthetic-profile-node",
            content: profileText,
            category: "Behavioral Profile",
            sourceType: "user_profile",
            taxonomy: "reflection",
            relevanceScore: 100,
            decayedImportance: 1.0,
            combinedScore: 1.0,
            traceReason: "System Generated Profile",
          });
        }
      }
    } catch (err) {
      logger.error("Failed to load user cognitive profile during retrieval", err);
    }

    return resultContextNodes;
  } catch (error) {
    logger.error("retrieveRelevantMemories error:", error);
    // Graceful fallback to empty context in case of critical error
    return [];
  }
}
