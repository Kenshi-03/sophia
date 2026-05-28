import { getRedisClient, CACHE_PREFIX } from '../redis';
import { logger } from '../logger';

const DAILY_LIMIT = 100; // Standard daily AI quota count per user

export async function checkUserAiQuota(userId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  resetSeconds: number;
}> {
  try {
    const client = getRedisClient();
    const key = `${CACHE_PREFIX}user:${userId}:ai_quota`;
    const current = await client.get(key);
    
    if (!current) {
      // First request: set to 1 and set TTL to 24 hours (86400 seconds)
      await client.set(key, '1', 'EX', 86400);
      return { allowed: true, current: 1, limit: DAILY_LIMIT, resetSeconds: 86400 };
    }
    
    const count = parseInt(current, 10);
    
    if (count >= DAILY_LIMIT) {
      const ttl = await client.ttl(key);
      logger.warn('User AI quota limit exceeded', { userId, count, limit: DAILY_LIMIT, ttl });
      return { 
        allowed: false, 
        current: count, 
        limit: DAILY_LIMIT, 
        resetSeconds: ttl > 0 ? ttl : 86400 
      };
    }
    
    const incremented = await client.incr(key);
    const ttl = await client.ttl(key);
    
    return {
      allowed: true,
      current: incremented,
      limit: DAILY_LIMIT,
      resetSeconds: ttl > 0 ? ttl : 86400,
    };
  } catch (err) {
    logger.error('Error checking user AI quota', err, { userId });
    // Fallback: allow the request if Redis is down, to ensure high availability (fail-open)
    return { allowed: true, current: 0, limit: DAILY_LIMIT, resetSeconds: 0 };
  }
}
