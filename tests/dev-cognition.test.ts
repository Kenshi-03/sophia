process.env.MOCK_REDIS = "true";
import { isDevCognitionModeEnabled, getCurrentUser } from "../lib/auth/session";
import { prisma } from "../lib/db/prisma";
import { GET } from "../app/api/dev/cognition-state/route";

jest.mock("../lib/auth/auth", () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

describe("DEV_COGNITION_MODE Tests", () => {
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    // Ensure clean slate before tests start
    try {
      await prisma.cognitiveProfile.deleteMany({ where: { userId: "dev-user" } });
      await prisma.memoryNode.deleteMany({ where: { userId: "dev-user" } });
      await prisma.user.deleteMany({ where: { id: "dev-user" } });
    } catch (e) {
      // Ignore
    }
  });

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(async () => {
    process.env = originalEnv;
    // Clean up dev-user after tests to keep DB clean
    try {
      await prisma.cognitiveProfile.deleteMany({ where: { userId: "dev-user" } });
      await prisma.memoryNode.deleteMany({ where: { userId: "dev-user" } });
      await prisma.user.deleteMany({ where: { id: "dev-user" } });
    } catch (e) {
      // Ignore if user does not exist
    }
    await prisma.$disconnect();
  });

  describe("isDevCognitionModeEnabled Helper", () => {
    it("should return false by default or when not in development", () => {
      (process.env as any).NODE_ENV = "production";
      process.env.DEV_COGNITION_MODE = "true";
      expect(isDevCognitionModeEnabled()).toBe(false);

      (process.env as any).NODE_ENV = "development";
      process.env.DEV_COGNITION_MODE = "false";
      expect(isDevCognitionModeEnabled()).toBe(false);
    });

    it("should return true only when NODE_ENV is development and DEV_COGNITION_MODE is true", () => {
      (process.env as any).NODE_ENV = "development";
      process.env.DEV_COGNITION_MODE = "true";
      expect(isDevCognitionModeEnabled()).toBe(true);
    });
  });

  describe("getCurrentUser Auth Bypass", () => {
    it("should return the mock dev-user when DEV_COGNITION_MODE is enabled", async () => {
      (process.env as any).NODE_ENV = "development";
      process.env.DEV_COGNITION_MODE = "true";

      const user = await getCurrentUser();
      expect(user).toBeDefined();
      expect(user!.id).toBe("dev-user");
      expect(user!.email).toBe("dev@sophia.local");
      expect(user!.name).toBe("SOPHIA Dev User User");

      // Verify the CognitiveProfile was upserted
      const profile = await prisma.cognitiveProfile.findUnique({
        where: { userId: "dev-user" }
      });
      expect(profile).toBeDefined();
      expect(profile!.userId).toBe("dev-user");

      // Verify the MemoryNodes were seeded
      const memoriesCount = await prisma.memoryNode.count({
        where: { userId: "dev-user" }
      });
      expect(memoriesCount).toBe(5);
    });
  });

  describe("/api/dev/cognition-state Route Guard", () => {
    it("should return 403 Forbidden when DEV_COGNITION_MODE is disabled", async () => {
      (process.env as any).NODE_ENV = "development";
      process.env.DEV_COGNITION_MODE = "false";

      const res = await GET();
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
    });

    it("should return 200 and logs when DEV_COGNITION_MODE is enabled", async () => {
      (process.env as any).NODE_ENV = "development";
      process.env.DEV_COGNITION_MODE = "true";

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.devMode).toBe(true);
      expect(body.activeExecutions).toBeDefined();
      expect(body.latestLogs).toBeDefined();
    });
  });
});
