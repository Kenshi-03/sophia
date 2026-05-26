import Redis, { RedisOptions } from 'ioredis';
import { logger } from './logger';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const getRedisOptions = (): RedisOptions => {
  return {
    maxRetriesPerRequest: null, // Critical requirement for BullMQ compatibility
    enableReadyCheck: false,
  };
};

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisInstance) {
    logger.info('Initializing shared Redis client instance', { url: redisUrl });
    redisInstance = new Redis(redisUrl, getRedisOptions());
    redisInstance.on('error', (err) => {
      logger.error('Redis client error', err);
    });
  }
  return redisInstance;
}

export const CACHE_PREFIX = 'v1:';

// Helper to get standard key names: e.g. v1:user:usr_123:cognitive:briefing
export function makeCacheKey(userId: string, domain: string, subKey?: string): string {
  return `${CACHE_PREFIX}user:${userId}:${domain}${subKey ? `:${subKey}` : ''}`;
}

export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  try {
    const data = await client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (err) {
    logger.error('Error fetching from Redis cache', err, { key });
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const client = getRedisClient();
  try {
    const data = JSON.stringify(value);
    if (ttlSeconds) {
      await client.set(key, data, 'EX', ttlSeconds);
    } else {
      await client.set(key, data);
    }
  } catch (err) {
    logger.error('Error setting Redis cache', err, { key });
  }
}

export async function invalidateCache(key: string): Promise<void> {
  const client = getRedisClient();
  try {
    await client.del(key);
    logger.debug('Invalidated cache key', { key });
  } catch (err) {
    logger.error('Error invalidating Redis cache', err, { key });
  }
}

export async function invalidateUserCache(userId: string, domain?: string): Promise<void> {
  const client = getRedisClient();
  try {
    // If domain is specified, we invalidate specifically, e.g. v1:user:userId:domain*
    // Otherwise invalidate all keys for the user v1:user:userId:*
    const pattern = `${CACHE_PREFIX}user:${userId}:${domain ? `${domain}*` : '*'}`;
    
    // We use SCAN to avoid blocking Redis with KEYS
    let cursor = '0';
    do {
      const [newCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = newCursor;
      if (keys.length > 0) {
        await client.del(...keys);
        logger.debug('Scanning and deleted user cache keys', { keys });
      }
    } while (cursor !== '0');
  } catch (err) {
    logger.error('Error invalidating user cache', err, { userId, domain });
  }
}
