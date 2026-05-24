import { routeUserQuery } from '@/lib/ai/orchestration/ai-router';

describe('AI Router Agent Selection Logic', () => {
  it('should route calendar-related queries to the schedule agent', () => {
    const result = routeUserQuery('What is on my calendar today?');
    expect(result).toBe('schedule');
  });

  it('should route memory-related queries to the memory agent', () => {
    const result = routeUserQuery('Recall what I learned about NextJS');
    expect(result).toBe('memory');
  });

  it('should route focus-related queries to the productivity agent', () => {
    const result = routeUserQuery('Help me optimize my productivity load');
    expect(result).toBe('productivity');
  });

  it('should fallback to general agent for unknown request intents', () => {
    const result = routeUserQuery('Hello SOPHIA');
    expect(result).toBe('general');
  });
});
