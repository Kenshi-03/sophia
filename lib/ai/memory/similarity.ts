import prisma from "../../db/prisma";
import { MemoryNode } from "@/types/memory";

export interface SemanticSearchResult {
  node: MemoryNode;
  similarityScore: number;
}

/**
 * Searches memory embeddings in PostgreSQL using the pgvector <=> cosine distance operator.
 * Restricts query using the HNSW index on the vector field for high efficiency.
 */
export async function searchSimilarMemories(
  userId: string,
  queryEmbedding: number[],
  limit: number = 20,
  minSimilarity: number = 0.3
): Promise<SemanticSearchResult[]> {
  try {
    // Format embedding vector array to PostgreSQL vector literal string format: "[val1,val2,...]"
    const embeddingString = `[${queryEmbedding.join(",")}]`;

    // Execute raw SQL using pgvector cosine distance operator (<=>).
    // Cosine similarity is computed as: 1 - Cosine Distance
    const results = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        mn.id,
        mn.content,
        mn.category,
        mn.tags,
        mn.importance,
        mn."decayRate",
        mn."sourceType",
        mn.visibility,
        mn.taxonomy,
        mn."contentHash",
        mn.reliability,
        mn."memoryType",
        mn."userId",
        mn."createdAt",
        (1.0 - (me.embedding <=> $1::vector)) AS "similarityScore"
      FROM "MemoryNode" mn
      JOIN "MemoryEmbedding" me ON mn.id = me."memoryNodeId"
      WHERE mn."userId" = $2
        AND me."embeddingStatus" = 'completed'
        AND (1.0 - (me.embedding <=> $1::vector)) >= $3
      ORDER BY me.embedding <=> $1::vector ASC
      LIMIT $4`,
      embeddingString,
      userId,
      minSimilarity,
      limit
    );

    if (!results || results.length === 0) {
      return [];
    }

    return results.map((row) => ({
      node: {
        id: row.id,
        content: row.content,
        category: row.category,
        tags: row.tags || [],
        importance: Number(row.importance ?? 1.0),
        decayRate: Number(row.decayRate ?? 0.01),
        sourceType: row.sourceType,
        visibility: row.visibility || "private",
        taxonomy: row.taxonomy || "reflection",
        contentHash: row.contentHash,
        reliability: Number(row.reliability ?? 1.0),
        memoryType: row.memoryType || "hybrid",
        userId: row.userId,
        createdAt: row.createdAt,
      } as unknown as MemoryNode,
      similarityScore: Number(row.similarityScore),
    }));
  } catch (error) {
    console.error("Gagal melakukan pencarian kesamaan semantik vektor:", error);
    return [];
  }
}
