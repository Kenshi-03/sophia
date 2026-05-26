import { makeCacheKey } from '../lib/redis';
import { estimateModelCost } from '../lib/ai/cost-tracker';

describe('Queue & Cache Architecture Tests', () => {
  describe('Cache Key Versioning Helper', () => {
    it('should generate properly versioned cache keys', () => {
      const userId = 'usr_test123';
      const key = makeCacheKey(userId, 'cognitive', 'briefing');
      expect(key).toBe('v1:user:usr_test123:cognitive:briefing');
    });

    it('should generate keys correctly without subkeys', () => {
      const userId = 'usr_456';
      const key = makeCacheKey(userId, 'profile');
      expect(key).toBe('v1:user:usr_456:profile');
    });
  });

  describe('AI Model Cost Estimation', () => {
    it('should calculate correct cost for Gemini Flash models', () => {
      const usage = { promptTokens: 1000, completionTokens: 2000 };
      const cost = estimateModelCost('gemini-2.5-flash', usage);
      // Prompt rate: 0.075 / 1M => 0.000075
      // Completion rate: 0.30 / 1M => 0.0006
      // Total: 0.000675
      expect(cost).toBeCloseTo(0.000675, 8);
    });

    it('should calculate correct cost for GPT-4o models', () => {
      const usage = { promptTokens: 100000, completionTokens: 50000 };
      const cost = estimateModelCost('gpt-4o', usage);
      // Prompt rate: 2.50 / 1M => 0.25
      // Completion rate: 10.00 / 1M => 0.50
      // Total: 0.75
      expect(cost).toBeCloseTo(0.75, 4);
    });

    it('should fallback to flash pricing for unknown models', () => {
      const usage = { promptTokens: 1000, completionTokens: 1000 };
      const cost = estimateModelCost('unknown-fancy-model', usage);
      const expected = estimateModelCost('gemini-1.5-flash', usage);
      expect(cost).toBe(expected);
    });
  });
});
