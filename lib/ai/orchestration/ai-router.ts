export type AgentType = 'schedule' | 'memory' | 'productivity' | 'general';

/**
 * Route user query to correct specialized agents
 */
export function routeUserQuery(query: string): AgentType {
  const q = query.toLowerCase();
  
  if (q.includes('schedule') || q.includes('calendar') || q.includes('event')) {
    return 'schedule';
  }
  
  if (q.includes('memory') || q.includes('learn') || q.includes('recall')) {
    return 'memory';
  }
  
  if (q.includes('focus') || q.includes('productivity') || q.includes('work')) {
    return 'productivity';
  }
  
  return 'general';
}
