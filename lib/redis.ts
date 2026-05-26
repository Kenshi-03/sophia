import IORedis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';
import { logger } from './logger';
import { RedisMock } from './redis-mock';

let redisInstance: any = null;
let tcpConnectionInstance: any = null;

export class UpstashClientWrapper {
  private upstash: UpstashRedis;

  constructor(upstash: UpstashRedis) {
    this.upstash = upstash;
  }

  async get(key: string): Promise<string | null> {
    const res = await this.upstash.get<any>(key);
    if (res === null) return null;
    return typeof res === 'object' ? JSON.stringify(res) : String(res);
  }

  async set(key: string, value: string, ...args: any[]): Promise<string> {
    const exIdx = args.indexOf('EX');
    if (exIdx !== -1) {
      const ttl = Number(args[exIdx + 1]);
      await this.upstash.set(key, value, { ex: ttl });
    } else {
      await this.upstash.set(key, value);
    }
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.upstash.del(...keys);
  }

  async incr(key: string): Promise<number> {
    return this.upstash.incr(key);
  }

  async ttl(key: string): Promise<number> {
    return this.upstash.ttl(key);
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    const res = await this.upstash.zadd(key, { score, member });
    return res ?? 0;
  }

  async zrem(key: string, member: string): Promise<number> {
    return this.upstash.zrem(key, member);
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.upstash.zrange(key, start, stop);
  }

  async zrangebyscore(key: string, min: number | string, max: number | string): Promise<string[]> {
    return this.upstash.zrange(key, min as any, max as any, { byScore: true });
  }

  async scan(cursor: string, ...args: any[]): Promise<[string, string[]]> {
    const matchIdx = args.indexOf('MATCH');
    const match = matchIdx !== -1 ? args[matchIdx + 1] : undefined;
    const countIdx = args.indexOf('COUNT');
    const count = countIdx !== -1 ? Number(args[countIdx + 1]) : undefined;

    const res = await this.upstash.scan(Number(cursor), {
      match,
      count,
    });
    return [String(res[0]), res[1]];
  }

  async eval(script: string, numkeys: number, ...args: any[]): Promise<any> {
    const keys = args.slice(0, numkeys);
    const evalArgs = args.slice(numkeys);
    return this.upstash.eval(script, keys, evalArgs);
  }

  async ping(): Promise<string> {
    return this.upstash.ping();
  }

  pipeline() {
    const pipe = this.upstash.pipeline();
    return {
      del(key: string) {
        pipe.del(key);
        return this;
      },
      zrem(setKey: string, key: string) {
        pipe.zrem(setKey, key);
        return this;
      },
      async exec(): Promise<any[]> {
        return pipe.exec();
      }
    };
  }
}

export function getRedisClient(): any {
  if (redisInstance) {
    return redisInstance;
  }

  if (process.env.NEXT_PHASE === 'phase-production-build') {
    logger.info('Next.js production build phase detected: using volatile RedisMock instance.');
    redisInstance = new RedisMock();
    return redisInstance;
  }

  if (process.env.MOCK_REDIS === 'true' || (globalThis as any).MOCK_REDIS === true) {
    logger.warn('Mock Redis enabled: using in-memory RedisMock instance.');
    redisInstance = new RedisMock();
    return redisInstance;
  }

  if (process.env.NODE_ENV === 'development' && process.env.USE_LOCAL_REDIS === 'true') {
    const localUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    logger.info('Initializing local Redis TCP client instance for dev', { url: localUrl });
    redisInstance = new IORedis(localUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    redisInstance.on('error', (err: any) => {
      logger.error('Local Redis TCP client error', err);
    });
    return redisInstance;
  }

  // Upstash REST client setup
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    logger.error('SOPHIA Redis configuration missing: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured.');
    throw new Error('SOPHIA Redis configuration missing');
  }

  logger.info('Initializing Upstash Serverless Redis client instance');
  const upstashClient = new UpstashRedis({
    url,
    token,
  });

  redisInstance = new UpstashClientWrapper(upstashClient);
  return redisInstance;
}

export function getRedisTCPConnection(): any {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    if (!redisInstance || !(redisInstance instanceof RedisMock)) {
      redisInstance = new RedisMock();
    }
    return redisInstance;
  }

  if (process.env.MOCK_REDIS === 'true' || (globalThis as any).MOCK_REDIS === true) {
    if (!redisInstance || !(redisInstance instanceof RedisMock)) {
      redisInstance = new RedisMock();
    }
    return redisInstance;
  }

  if (process.env.NODE_ENV === 'development' && process.env.USE_LOCAL_REDIS === 'true') {
    if (!tcpConnectionInstance || tcpConnectionInstance instanceof RedisMock) {
      const localUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
      logger.info('Initializing local Redis TCP client instance for BullMQ', { url: localUrl });
      tcpConnectionInstance = new IORedis(localUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
      tcpConnectionInstance.on('error', (err: any) => {
        logger.error('Local TCP Redis error', err);
      });
    }
    return tcpConnectionInstance;
  }

  // Production or standard Upstash TCP for BullMQ
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!restUrl || !token) {
    logger.error('SOPHIA Redis configuration missing: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for TCP connections.');
    throw new Error('SOPHIA Redis configuration missing');
  }

  if (!tcpConnectionInstance || tcpConnectionInstance instanceof RedisMock) {
    try {
      const url = new URL(restUrl);
      const host = url.hostname;
      const port = 6379; // Upstash TLS port

      logger.info('Initializing Upstash Redis TCP client instance for BullMQ', { host, port });
      tcpConnectionInstance = new IORedis({
        host,
        port,
        password: token,
        tls: {}, // Critical: Upstash requires SSL/TLS for external connections
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });

      tcpConnectionInstance.on('error', (err: any) => {
        logger.error('Upstash Redis TCP client error', err);
      });
    } catch (e: any) {
      logger.error('Failed to parse UPSTASH_REDIS_REST_URL for TCP config', e);
      throw new Error(`SOPHIA Redis configuration invalid: ${e.message}`);
    }
  }

  return tcpConnectionInstance;
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
    const pattern = `${CACHE_PREFIX}user:${userId}:${domain ? `${domain}*` : '*'}`;
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

// Export lazy singleton wrapper to prevent build crashes
export const redis = {
  get: (key: string) => getRedisClient().get(key),
  set: (key: string, val: string, ...args: any[]) => getRedisClient().set(key, val, ...args),
  del: (...keys: string[]) => getRedisClient().del(...keys),
  incr: (key: string) => getRedisClient().incr(key),
  ttl: (key: string) => getRedisClient().ttl(key),
  zadd: (key: string, score: number, member: string) => getRedisClient().zadd(key, score, member),
  zrem: (key: string, member: string) => getRedisClient().zrem(key, member),
  zrange: (key: string, start: number, stop: number) => getRedisClient().zrange(key, start, stop),
  zrangebyscore: (key: string, min: number | string, max: number | string) => getRedisClient().zrangebyscore(key, min, max),
  scan: (cursor: string, ...args: any[]) => getRedisClient().scan(cursor, ...args),
  eval: (script: string, numkeys: number, ...args: any[]) => getRedisClient().eval(script, numkeys, ...args),
  pipeline: () => getRedisClient().pipeline(),
  ping: () => getRedisClient().ping(),
};
