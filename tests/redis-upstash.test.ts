import { UpstashClientWrapper } from "../lib/redis";
import { Redis as UpstashRedis } from "@upstash/redis";

jest.mock("@upstash/redis", () => {
  return {
    Redis: jest.fn().mockImplementation(() => {
      return {
        get: jest.fn().mockResolvedValue("mocked-value"),
        set: jest.fn().mockResolvedValue("OK"),
        del: jest.fn().mockResolvedValue(1),
        incr: jest.fn().mockResolvedValue(2),
        ttl: jest.fn().mockResolvedValue(300),
        zadd: jest.fn().mockResolvedValue(1),
        zrem: jest.fn().mockResolvedValue(1),
        zrange: jest.fn().mockImplementation((key, start, stop, options) => {
          return Promise.resolve(["a", "b"]);
        }),
        scan: jest.fn().mockResolvedValue([0, ["key1"]]),
        eval: jest.fn().mockResolvedValue("eval-ok"),
        ping: jest.fn().mockResolvedValue("PONG"),
        pipeline: jest.fn().mockImplementation(() => {
          return {
            del: jest.fn().mockReturnThis(),
            zrem: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([1, 1]),
          };
        }),
      };
    }),
  };
});

describe("Upstash Redis Infrastructure Tests", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("UpstashClientWrapper Signature Mappings", () => {
    it("should correctly wrap and delegate ioredis calls to upstash HTTP client", async () => {
      const mockUpstash = new UpstashRedis({ url: "http://dummy", token: "dummy" });
      const wrapper = new UpstashClientWrapper(mockUpstash);

      expect(await wrapper.get("key")).toBe("mocked-value");
      expect(await wrapper.set("key", "val", "EX", 10)).toBe("OK");
      expect(await wrapper.del("key")).toBe(1);
      expect(await wrapper.incr("key")).toBe(2);
      expect(await wrapper.ttl("key")).toBe(300);
      expect(await wrapper.zadd("key", 10, "mem")).toBe(1);
      expect(await wrapper.zrem("key", "mem")).toBe(1);
      expect(await wrapper.zrange("key", 0, -1)).toEqual(["a", "b"]);
      expect(await wrapper.zrangebyscore("key", "-inf", "+inf")).toEqual(["a", "b"]);
      expect(await wrapper.scan("0", "MATCH", "*", "COUNT", 10)).toEqual(["0", ["key1"]]);
      expect(await wrapper.eval("return 1", 1, "k1", "a1")).toBe("eval-ok");
      expect(await wrapper.ping()).toBe("PONG");

      const pipe = wrapper.pipeline();
      pipe.del("key").zrem("set", "key");
      expect(await pipe.exec()).toEqual([1, 1]);
    });
  });

  describe("Centralized Client Startup Guards", () => {
    it("should throw a startup error if Upstash config is missing and MOCK_REDIS is disabled", () => {
      process.env.MOCK_REDIS = "false";
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      jest.isolateModules(() => {
        const { getRedisClient } = require("../lib/redis");
        expect(() => getRedisClient()).toThrow("SOPHIA Redis configuration missing");
      });
    });

    it("should instantiate correctly without crashing when MOCK_REDIS is true", () => {
      process.env.MOCK_REDIS = "true";
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      jest.isolateModules(() => {
        const { getRedisClient } = require("../lib/redis");
        const client = getRedisClient();
        expect(client.constructor.name).toBe("RedisMock");
      });
    });
  });
});
