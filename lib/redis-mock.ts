import { logger } from './logger';

export class RedisMock {
  private store = new Map<string, string>();
  private activeSet = new Map<string, number>();

  constructor() {
    logger.warn('⚠️ WARNING: Using in-memory RedisMock. All cache and state updates will be volatile.');
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (event === 'ready' || event === 'connect') {
      setTimeout(callback, 0);
    }
    return this;
  }

  async get(key: string) {
    return this.store.get(key) || null;
  }

  async set(key: string, val: string, ...args: any[]) {
    // handle set options like EX
    const exIdx = args.indexOf('EX');
    const ttlSeconds = exIdx !== -1 ? Number(args[exIdx + 1]) : undefined;
    
    this.store.set(key, val);
    return 'OK';
  }

  async del(...keys: string[]) {
    let deleted = 0;
    for (const key of keys) {
      if (this.store.delete(key)) deleted++;
    }
    return deleted;
  }

  // scan helper
  async scan(cursor: string, ...args: any[]) {
    const patternIdx = args.indexOf('MATCH');
    const pattern = patternIdx !== -1 ? args[patternIdx + 1] : '*';
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    
    const matchedKeys = Array.from(this.store.keys()).filter(k => regex.test(k));
    return ['0', matchedKeys];
  }

  // zadd helper
  async zadd(key: string, score: number | string, member: string) {
    const numericScore = typeof score === 'string' ? parseFloat(score) : score;
    this.activeSet.set(member, numericScore);
    return 1;
  }

  // zrem helper
  async zrem(key: string, member: string) {
    this.activeSet.delete(member);
    return 1;
  }

  // zrange helper
  async zrange(key: string, start: number, stop: number) {
    return Array.from(this.activeSet.keys());
  }

  // zrangebyscore helper
  async zrangebyscore(key: string, min: string | number, max: string | number) {
    const maxVal = typeof max === 'string' ? parseFloat(max) : max;
    const results: string[] = [];
    for (const [member, score] of this.activeSet.entries()) {
      if (score <= maxVal) {
        results.push(member);
      }
    }
    return results;
  }

  // eval mock (for our specific version check Lua script)
  async eval(script: string, numkeys: number, ...args: any[]) {
    const key = args[0];
    const activeSetKey = args[1];
    const stateStr = args[2];
    const ttl = Number(args[3]);
    const expectedVersion = Number(args[4]);
    const expiresAt = Number(args[5]);

    const current = this.store.get(key);
    if (!current) {
      if (expectedVersion !== 0) {
        return 0; // expected key but it wasn't there
      }
      this.store.set(key, stateStr);
      this.activeSet.set(key, expiresAt);
      return 1; // successful creation
    } else {
      const currObj = JSON.parse(current);
      if (currObj.version !== expectedVersion) {
        return 0; // version conflict!
      }
      this.store.set(key, stateStr);
      this.activeSet.set(key, expiresAt);
      return 1; // successful update
    }
  }

  pipeline() {
    const self = this;
    const commands: Array<() => Promise<any>> = [];
    return {
      del(key: string) {
        commands.push(() => self.del(key));
        return this;
      },
      zrem(setKey: string, key: string) {
        commands.push(async () => {
          self.activeSet.delete(key);
          return 1;
        });
        return this;
      },
      async exec() {
        for (const cmd of commands) {
          await cmd();
        }
        return [];
      }
    };
  }

  // Clear static stores for testing
  clearAll() {
    this.store.clear();
    this.activeSet.clear();
  }

  async ping() {
    return 'PONG';
  }
}
