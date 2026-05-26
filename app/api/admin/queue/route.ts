import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { calendarSyncQueue, cognitiveAnalysisQueue, memoryQueue } from '@/lib/queue/client';
import { getRedisClient } from '@/lib/redis';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch Queue Statistics (BullMQ)
    const [syncCounts, cognitiveCounts, memoryCounts] = await Promise.all([
      calendarSyncQueue.getJobCounts(),
      cognitiveAnalysisQueue.getJobCounts(),
      memoryQueue.getJobCounts(),
    ]);

    // 2. Fetch permanently failed jobs (DLQ check)
    const [failedSync, failedCognitive, failedMemory] = await Promise.all([
      calendarSyncQueue.getFailed(0, 10),
      cognitiveAnalysisQueue.getFailed(0, 10),
      memoryQueue.getFailed(0, 10),
    ]);

    const formatFailedJob = (job: any) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace?.slice(0, 3),
      failedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    });

    const dlq = {
      calendarSync: failedSync.map(formatFailedJob),
      cognitiveAnalysis: failedCognitive.map(formatFailedJob),
      memory: failedMemory.map(formatFailedJob),
    };

    // 3. Fetch user AI costs and token metrics (PostgreSQL)
    const aiUsagesSummary = await prisma.aiUsage.aggregate({
      _sum: {
        promptTokens: true,
        completionTokens: true,
        estimatedCost: true,
      },
      _count: {
        id: true,
      }
    });

    const usagesByUser = await prisma.aiUsage.groupBy({
      by: ['userId'],
      _sum: {
        promptTokens: true,
        completionTokens: true,
        estimatedCost: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          estimatedCost: 'desc',
        }
      },
      take: 10,
    });

    // Fetch user details for the top users
    const userIds = usagesByUser.map(u => u.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true }
    });

    const formattedUsagesByUser = usagesByUser.map((usage) => {
      const userDetails = users.find(u => u.id === usage.userId);
      return {
        userId: usage.userId,
        email: userDetails?.email || 'unknown@sophia.local',
        name: userDetails?.name || 'Unknown',
        requestCount: usage._count.id,
        promptTokens: usage._sum.promptTokens || 0,
        completionTokens: usage._sum.completionTokens || 0,
        estimatedCost: usage._sum.estimatedCost || 0,
      };
    });

    // 4. Redis connection status
    let redisConnected = false;
    try {
      const redis = getRedisClient();
      const ping = await redis.ping();
      redisConnected = ping === 'PONG';
    } catch (err) {
      logger.error('Admin endpoint Redis connection failure', err);
    }

    return NextResponse.json({
      success: true,
      infra: {
        redisConnected,
      },
      queues: {
        calendarSync: syncCounts,
        cognitiveAnalysis: cognitiveCounts,
        memory: memoryCounts,
      },
      dlq: {
        counts: {
          calendarSync: syncCounts.failed || 0,
          cognitiveAnalysis: cognitiveCounts.failed || 0,
          memory: memoryCounts.failed || 0,
        },
        recentFailures: dlq,
      },
      aiUsage: {
        totalRequests: aiUsagesSummary._count.id,
        totalPromptTokens: aiUsagesSummary._sum.promptTokens || 0,
        totalCompletionTokens: aiUsagesSummary._sum.completionTokens || 0,
        totalEstimatedCost: aiUsagesSummary._sum.estimatedCost || 0,
        topUsers: formattedUsagesByUser,
      }
    });

  } catch (error: any) {
    logger.error('Failed to compile admin statistics', error);
    return NextResponse.json({ error: 'Failed to retrieve admin stats', details: error.message }, { status: 500 });
  }
}
