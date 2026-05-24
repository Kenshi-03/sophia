import { calculateFocusScore } from '@/lib/utils/calculate-focus';

describe('Productivity Metric Calculations', () => {
  it('should return optimal focus index 100 for empty schedule days', () => {
    const score = calculateFocusScore(0, 0);
    expect(score).toBe(100);
  });

  it('should decline load index when calendar duration increases', () => {
    const score = calculateFocusScore(4, 240);
    expect(score).toBeLessThan(100);
  });
});
