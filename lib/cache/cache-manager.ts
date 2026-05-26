import { getRedisClient } from '../redis';
import { logger } from '../logger';

interface CacheWrapper<T> {
  data: T;
  expiresAt: number; // Milliseconds timestamp when data becomes stale
}

export const cacheManager = {
  /**
   * Get data from cache, or compute it if missing.
   * If stale, returns stale data immediately and triggers background revalidation.
   * Degrades gracefully by executing fetcher directly if Redis fails.
   */
  async getOrCompute<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number,
    gracePeriodSeconds: number = 7 * 24 * 3600, // 7 days fallback for stale cache retention
    onRevalidate?: () => Promise<void> | void
  ): Promise<T> {
    try {
      const client = getRedisClient();
      const cachedStr = await client.get(key);
      
      if (cachedStr) {
        const cached: CacheWrapper<T> = JSON.parse(cachedStr);
        const now = Date.now();
        
        if (now <= cached.expiresAt) {
          logger.debug('Cache hit (fresh)', { key });
          return cached.data;
        }
        
        // Cache is stale. Return stale and trigger background revalidation.
        logger.info('Cache hit (stale). Returning stale data & triggering revalidation.', { key });
        
        if (onRevalidate) {
          try {
            const reval = onRevalidate();
            if (reval instanceof Promise) {
              reval.catch((err) => logger.error('Asynchronous revalidation promise failed', err, { key }));
            }
          } catch (err) {
            logger.error('Failed executing background revalidation callback', err, { key });
          }
        } else {
          // Default: execute the fetcher asynchronously and cache the new result
          (async () => {
            try {
              const freshData = await fetcher();
              await this.set(key, freshData, ttlSeconds, gracePeriodSeconds);
              logger.info('Background revalidation fetcher completed', { key });
            } catch (err) {
              logger.error('Background revalidation fetcher failed', err, { key });
            }
          })();
        }
        
        return cached.data;
      }
    } catch (err) {
      logger.error('Redis cache retrieval failed. Graceful degradation active.', err, { key });
      return await fetcher();
    }

    // Cache miss - compute synchronously
    logger.info('Cache miss. Computing synchronously.', { key });
    try {
      const freshData = await fetcher();
      // Try to cache, but don't fail the request if Redis set fails
      await this.set(key, freshData, ttlSeconds, gracePeriodSeconds).catch((err) => 
        logger.error('Failed to set cache after sync compute', err, { key })
      );
      return freshData;
    } catch (err) {
      logger.error('Sync compute fetcher failed', err, { key });
      throw err;
    }
  },

  /**
   * Directly write data to cache with a given freshness TTL and stale retention grace period.
   * Catches errors gracefully.
   */
  async set<T>(
    key: string,
    data: T,
    ttlSeconds: number,
    gracePeriodSeconds: number = 7 * 24 * 3600
  ): Promise<void> {
    try {
      const client = getRedisClient();
      const expiresAt = Date.now() + (ttlSeconds * 1000);
      const wrapper: CacheWrapper<T> = { data, expiresAt };
      const totalTtl = ttlSeconds + gracePeriodSeconds;
      await client.set(key, JSON.stringify(wrapper), 'EX', totalTtl);
      logger.debug('Cache write successful', { key, ttlSeconds, totalTtl });
    } catch (err) {
      logger.error('Redis cache write failed. Graceful degradation active.', err, { key });
    }
  },

  /**
   * Invalidate a single key gracefully.
   */
  async delete(key: string): Promise<void> {
    try {
      const client = getRedisClient();
      await client.del(key);
      logger.debug('Cache key deleted', { key });
    } catch (err) {
      logger.error('Redis cache delete failed. Graceful degradation active.', err, { key });
    }
  }
};
