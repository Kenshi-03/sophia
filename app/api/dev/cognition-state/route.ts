import { NextResponse } from 'next/server';
import { isDevCognitionModeEnabled } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getRedisClient } from '@/lib/redis';

export async function GET() {
  if (!isDevCognitionModeEnabled()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const userId = 'dev-user';

    // 1. Get active executions from Redis
    const redis = getRedisClient();
    const activeSetKey = 'v1:system:active-executions';
    const activeKeys = await redis.zrange(activeSetKey, 0, -1);

    const activeStates = [];
    for (const key of activeKeys) {
      if (key.includes(`v1:user:${userId}:working-memory:`)) {
        const dataStr = await redis.get(key);
        if (dataStr) {
          try {
            const state = JSON.parse(dataStr);
            activeStates.push(state);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    // 2. Get latest logs from PostgreSQL
    const latestLogs = await prisma.workingMemoryLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      devMode: true,
      activeExecutions: activeStates,
      latestLogs: latestLogs.map(log => ({
        id: log.id,
        executionId: log.executionId,
        sessionId: log.sessionId,
        finalStage: log.finalStage,
        tokenBudget: log.tokenBudget,
        totalTokens: log.totalTokens,
        latencyMs: log.latencyMs,
        retrievalTrace: log.retrievalTrace,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error('Failed to retrieve cognition state debug payload', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
