import { Worker, Job } from 'bullmq';
import { getRedisClient, makeCacheKey } from '../redis';
import { logger } from '../logger';
import { syncUserCalendar } from '../google/calendar/sync';
import { generateCognitiveBriefing } from '../ai/cognitive/briefing-generator';
import { cacheManager } from '../cache/cache-manager';
import prisma from '../db/prisma';
import { decrypt } from '../security/encryption';
import { generateGatewayResponse } from '../ai/gateway/maia_gateway';
import { getEmbedding } from '../ai/memory/embedding';
import { createMemoryNode } from '../db/queries/memory';
import { memoryQueue } from './client';
import crypto from 'crypto';

const redisConnection = getRedisClient();

export function startWorkers() {
  logger.info('Starting BullMQ Workers...');

  // 1. Calendar Sync Worker
  const calendarSyncWorker = new Worker(
    'calendarSync',
    async (job: Job) => {
      const { userId } = job.data;
      if (!userId) throw new Error('Missing userId in calendarSync job data');
      
      logger.info('Processing calendarSync job', { jobId: job.id, userId });
      const result = await syncUserCalendar(userId);
      logger.info('CalendarSync job completed successfully', { jobId: job.id, userId });
      return result;
    },
    { connection: redisConnection }
  );

  // 2. Cognitive Analysis Worker
  const cognitiveAnalysisWorker = new Worker(
    'cognitiveAnalysis',
    async (job: Job) => {
      const { userId } = job.data;
      if (!userId) throw new Error('Missing userId in cognitiveAnalysis job data');

      logger.info('Processing cognitiveAnalysis job', { jobId: job.id, userId });
      const briefing = await generateCognitiveBriefing(userId);
      
      // Cache the fresh briefing
      const cacheKey = makeCacheKey(userId, 'cognitive', 'briefing');
      await cacheManager.set(cacheKey, briefing, 3600); // 1 hour TTL
      
      logger.info('CognitiveAnalysis job completed and cached successfully', { jobId: job.id, userId });
      return { success: true };
    },
    { connection: redisConnection }
  );

  // 3. Memory Worker
  const memoryWorker = new Worker(
    'memory',
    async (job: Job) => {
      const { userId, memoryId, action } = job.data;
      logger.info('Processing memory background job', { jobId: job.id, userId, memoryId, action });
      
      if (!userId) {
        throw new Error('Missing userId in memory job data');
      }

      // Action A: Generate single embedding
      if (action === 'generate-embedding') {
        if (!memoryId) throw new Error('Missing memoryId in generate-embedding job');
        const node = await prisma.memoryNode.findUnique({
          where: { id: memoryId }
        });

        if (!node) {
          logger.warn(`generate-embedding: memoryNode not found`, { memoryId });
          return { success: false, error: 'MemoryNode not found' };
        }

        const vector = await getEmbedding(node.content, userId);
        const embeddingString = `[${vector.join(',')}]`;
        const embeddingId = crypto.randomUUID();

        await prisma.$executeRawUnsafe(
          `INSERT INTO "MemoryEmbedding" ("id", "memoryNodeId", "embedding", "embeddingModel", "embeddingVersion", "embeddingStatus", "lastEmbeddedAt", "createdAt", "updatedAt")
           VALUES ($1, $2, $3::vector, 'text-embedding-004', 'v1', 'completed', NOW(), NOW(), NOW())
           ON CONFLICT ("memoryNodeId") DO UPDATE
           SET "embedding" = $3::vector,
               "embeddingStatus" = 'completed',
               "lastEmbeddedAt" = NOW(),
               "updatedAt" = NOW()`,
          embeddingId,
          memoryId,
          embeddingString
        );

        logger.info(`Successfully generated and saved embedding for memory node`, { memoryId, userId });
        return { success: true };
      }

      // Action B: Re-index embeddings for out-of-date or missing embeddings
      if (action === 'reindex-embeddings') {
        const nodes = await prisma.memoryNode.findMany({
          where: {
            userId,
            OR: [
              { embedding: null },
              {
                embedding: {
                  OR: [
                    { embeddingStatus: { not: 'completed' } },
                    { embeddingVersion: { not: 'v1' } }
                  ]
                }
              }
            ]
          },
          select: { id: true }
        });

        logger.info(`Re-indexing embeddings: found ${nodes.length} nodes for user ${userId}`);
        for (const node of nodes) {
          await memoryQueue.add(
            `generate-embedding-${node.id}`,
            { userId, memoryId: node.id, action: 'generate-embedding' }
          ).catch(err => {
            logger.error(`Failed to queue reindexing job for node ${node.id}`, err);
          });
        }
        return { success: true, count: nodes.length };
      }

      // Action C: Consolidate old episodic memories into semantic insights
      if (action === 'consolidate-memories') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const oldEpisodicMemories = await prisma.memoryNode.findMany({
          where: {
            userId,
            memoryType: 'episodic',
            createdAt: { lt: sevenDaysAgo },
          },
          orderBy: { createdAt: 'asc' }
        });

        if (oldEpisodicMemories.length < 3) {
          logger.info('Not enough old episodic memories to consolidate', { userId, count: oldEpisodicMemories.length });
          return { success: true, consolidated: 0 };
        }

        const textToConsolidate = oldEpisodicMemories.map(m => `- [${m.category}] ${m.content}`).join('\n');
        
        const systemPrompt = `You are SOPHIA's Memory Consolidation engine.
Your task is to analyze multiple old episodic memory logs of a user and synthesize them into high-level, generalized, and long-term behavioral patterns (semantic memories/insights).
Ensure the output is written in Indonesian, is concise, and extracts the core productivity trends, emotional triggers, stress markers, or focus patterns.
Respond ONLY with a JSON object in this format:
{
  "consolidatedInsights": [
    {
      "content": "Deskripsi pola jangka panjang atau insight perilaku",
      "category": "Nama kategori (misal: Work, Health, Focus, dll)",
      "taxonomy": "insight | stress-marker | recovery-event | reflection",
      "importance": 0.8
    }
  ]
}`;
        
        const userPrompt = `Berikut adalah memori episodik lama dari pengguna:\n${textToConsolidate}\n\nKonsolidasikan memori-memori ini menjadi pola jangka panjang.`;

        const settings = await prisma.userSettings.findUnique({ where: { userId } });
        const customApiKey = settings?.aiApiKey ? decrypt(settings.aiApiKey) : null;

        const aiResponse = await generateGatewayResponse(userPrompt, {
          systemInstruction: systemPrompt,
          model: settings?.aiModel || "maia/gemini-2.5-flash",
          temperature: 0.3,
          customApiKey,
          userId
        });

        try {
          let cleanText = aiResponse.text.trim();
          const jsonStart = cleanText.indexOf('{');
          const jsonEnd = cleanText.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
          }

          const parsed = JSON.parse(cleanText);
          const insights = parsed.consolidatedInsights || [];

          for (const insight of insights) {
            await createMemoryNode({
              userId,
              content: insight.content,
              category: insight.category || "Reflection",
              importance: insight.importance || 0.7,
              decayRate: 0.002, // Semantic memories decay slower
              sourceType: 'ai-consolidation',
              visibility: 'ai-only',
              taxonomy: insight.taxonomy || 'insight',
              reliability: 0.8,
              memoryType: 'semantic'
            });
          }

          // Degrade importance of consolidated episodic memories
          const nodeIds = oldEpisodicMemories.map(m => m.id);
          await prisma.memoryNode.updateMany({
            where: { id: { in: nodeIds } },
            data: {
              importance: 0.1,
              decayRate: 0.05
            }
          });

          logger.info(`Consolidated ${oldEpisodicMemories.length} memories into ${insights.length} semantic patterns`, { userId });
          return { success: true, consolidated: oldEpisodicMemories.length, newInsightsCount: insights.length };
        } catch (parseErr) {
          logger.error('Failed to parse consolidation JSON response', parseErr, { responseText: aiResponse.text });
          return { success: false, error: 'JSON parsing failure' };
        }
      }

      // Action D: Update Cognitive Profile based on last 14 days of metrics
      if (action === 'update-profile') {
        const states = await prisma.dailyCognitiveState.findMany({
          where: { userId },
          orderBy: { date: 'desc' },
          take: 14,
        });

        if (states.length === 0) {
          logger.info('No daily states found to update cognitive profile', { userId });
          return { success: true, updated: false };
        }

        let totalLoad = 0;
        let totalFocus = 0;
        let totalRecovery = 0;
        let totalConfidence = 0;
        let confidenceCount = 0;
        let highLoadDays = 0;

        states.forEach(s => {
          totalLoad += s.cognitiveLoad;
          totalFocus += s.focusMinutes;
          totalRecovery += s.recoveryMinutes;
          if (s.confidenceScore !== null && s.confidenceScore !== undefined) {
            totalConfidence += s.confidenceScore;
            confidenceCount++;
          }
          if (s.burnoutRisk === 'high' || s.cognitiveLoad > 75) {
            highLoadDays++;
          }
        });

        const avgRecovery = totalRecovery / states.length;
        const consistency = Math.max(10, Math.min(100, 100 - (highLoadDays / states.length) * 50));

        const focusTrend = states.map(s => ({ date: s.date.toISOString().split('T')[0], value: s.focusMinutes }));
        const stressTrend = states.map(s => ({ date: s.date.toISOString().split('T')[0], value: s.cognitiveLoad }));
        const recoveryTrend = states.map(s => ({ date: s.date.toISOString().split('T')[0], value: s.recoveryMinutes }));

        await prisma.cognitiveProfile.upsert({
          where: { userId },
          create: {
            userId,
            overloadTolerance: 75.0,
            recoveryQuality: Math.min(100, avgRecovery / 3),
            productivityConsistency: consistency,
            focusTrend: focusTrend as any,
            stressTrend: stressTrend as any,
            recoveryTrend: recoveryTrend as any,
          },
          update: {
            recoveryQuality: Math.min(100, avgRecovery / 3),
            productivityConsistency: consistency,
            focusTrend: focusTrend as any,
            stressTrend: stressTrend as any,
            recoveryTrend: recoveryTrend as any,
          }
        });

        logger.info('Updated user cognitive profile successfully based on history', { userId });
        return { success: true, updated: true };
      }

      // Action E: Adaptive Self-Correction Loop
      if (action === 'adaptive-self-correction') {
        const recentNodes = await prisma.memoryNode.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        const olderNodes = await prisma.memoryNode.findMany({
          where: {
            userId,
            createdAt: { lt: new Date(Date.now() - 3 * 24 * 3600 * 1000) }
          },
          orderBy: { createdAt: 'desc' },
          take: 15,
        });

        if (recentNodes.length === 0 || olderNodes.length === 0) {
          return { success: true, revised: 0 };
        }

        const recentText = recentNodes.map(m => `ID: ${m.id} [${m.taxonomy}] ${m.content}`).join('\n');
        const olderText = olderNodes.map(m => `ID: ${m.id} [${m.taxonomy}] ${m.content}`).join('\n');

        const systemPrompt = `You are SOPHIA's Adaptive Self-Correction engine.
Your task is to analyze recent memories against older memories to detect contradictions, updates in habits, or behavioral shifts.
If a user's recent memory contradicts an older one, you must flag this contradiction.
Respond ONLY with a JSON object in this format:
{
  "corrections": [
    {
      "obsoleteMemoryId": "ID dari memori lama yang bertolak belakang",
      "reason": "Alasan pertentangan atau pergeseran kebiasaan",
      "confidence": 0.9
    }
  ]
}`;
        
        const userPrompt = `Recent Memories:\n${recentText}\n\nOlder Memories:\n${olderText}`;

        const settings = await prisma.userSettings.findUnique({ where: { userId } });
        const customApiKey = settings?.aiApiKey ? decrypt(settings.aiApiKey) : null;

        const aiResponse = await generateGatewayResponse(userPrompt, {
          systemInstruction: systemPrompt,
          model: settings?.aiModel || "maia/gemini-2.5-flash",
          temperature: 0.2,
          customApiKey,
          userId
        });

        try {
          let cleanText = aiResponse.text.trim();
          const jsonStart = cleanText.indexOf('{');
          const jsonEnd = cleanText.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
          }

          const parsed = JSON.parse(cleanText);
          const corrections = parsed.corrections || [];

          for (const corr of corrections) {
            await prisma.memoryNode.update({
              where: { id: corr.obsoleteMemoryId },
              data: {
                importance: 0.05,
                decayRate: 0.1,
              }
            });

            await prisma.memoryRelation.updateMany({
              where: {
                OR: [
                  { sourceId: corr.obsoleteMemoryId },
                  { targetId: corr.obsoleteMemoryId }
                ]
              },
              data: {
                relationStrength: 0.1,
                relationConfidence: 0.2
              }
            });
          }

          logger.info(`Adaptive self-correction completed for user. Flagged ${corrections.length} outdated behaviors.`, { userId });
          return { success: true, revised: corrections.length };
        } catch (parseErr) {
          logger.error('Failed to parse adaptive-self-correction JSON', parseErr);
          return { success: false, error: 'JSON parsing failure' };
        }
      }

      return { success: true };
    },
    { connection: redisConnection }
  );

  // Error/DLQ Handling Setup
  const workers = [calendarSyncWorker, cognitiveAnalysisWorker, memoryWorker];

  workers.forEach((worker) => {
    worker.on('failed', (job, err) => {
      logger.error(`Job failed in queue [${worker.name}]`, err, {
        jobId: job?.id,
        data: job?.data,
        attemptsMade: job?.attemptsMade,
      });
    });

    worker.on('error', (err) => {
      logger.error(`Worker error in [${worker.name}]`, err);
    });

    worker.on('completed', (job) => {
      logger.info(`Job completed in queue [${worker.name}]`, { jobId: job.id });
    });
  });

  return {
    calendarSyncWorker,
    cognitiveAnalysisWorker,
    memoryWorker,
    close: async () => {
      logger.info('Closing all workers...');
      await Promise.all(workers.map(w => w.close()));
    }
  };
}

