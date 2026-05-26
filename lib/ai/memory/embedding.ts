import crypto from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../../db/prisma";
import { getSettings } from "../../settings/settings";
import { decrypt } from "../../security/encryption";
import { logger } from "../../logger";

/**
 * Compute SHA-256 hash of the memory content for staleness / duplication checks.
 */
export function computeContentHash(content: string): string {
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}

/**
 * Generates or retrieves a cached embedding vector (768 dimensions) for a given text.
 */
export async function getEmbedding(text: string, userId: string): Promise<number[]> {
  const contentHash = computeContentHash(text);
  
  // 1. Embedding Deduplication & Reuse Strategy
  try {
    const existingNode = await prisma.memoryNode.findFirst({
      where: {
        contentHash,
        embedding: {
          embeddingStatus: "completed",
        },
      },
      select: {
        id: true,
      },
    });

    if (existingNode) {
      const rawEmbedding = await prisma.$queryRawUnsafe<Array<{ embedding: string }>>(
        `SELECT "embedding"::text FROM "MemoryEmbedding" WHERE "memoryNodeId" = $1 AND "embeddingStatus" = 'completed'`,
        existingNode.id
      );

      if (rawEmbedding && rawEmbedding.length > 0 && rawEmbedding[0].embedding) {
        const vectorStr = rawEmbedding[0].embedding;
        // Parse PG vector format, e.g. "[0.123,0.456,...]"
        const vector = vectorStr.replace(/[\[\]]/g, "").split(",").map(Number);
        if (vector.length === 768) {
          logger.info("Reusing existing embedding vector (deduplication check passed)", {
            userId,
            contentHash,
          });
          return vector;
        }
      }
    }
  } catch (err) {
    logger.error("Error checking for duplicate embedding reuse", err);
  }

  // 2. Fetch API key from settings or env
  const settings = await getSettings(userId);
  const customApiKey = settings?.aiApiKey ? decrypt(settings.aiApiKey) : null;
  const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

  if (!apiKey) {
    throw new Error("Kredensial API Key Gemini tidak terkonfigurasi. Selesaikan onboarding atau hubungi administrator.");
  }

  // 3. Request embedding generation via @google/generative-ai
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    
    if (!result?.embedding?.values) {
      throw new Error("Respons embedding dari Google Generative AI kosong.");
    }
    
    return result.embedding.values;
  } catch (error) {
    logger.error("Gagal melakukan generate embedding lewat Google Generative AI SDK", error);
    throw error;
  }
}
