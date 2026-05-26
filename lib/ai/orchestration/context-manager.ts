import { ContextAssemblyEngine } from '../working-memory/assembly';
import { RetrievalCandidate } from '../working-memory/types';
import { CalendarEvent } from '@/types/calendar';

export function assembleAgentContext(
  userQuery: string,
  memories: RetrievalCandidate[],
  calendarEvents: CalendarEvent[],
  options?: {
    sessionId?: string;
    activeTopic?: string;
    currentStage?: string;
    protectedAnchorIds?: string[];
  }
): string {
  const assembled = ContextAssemblyEngine.assemble(memories, {
    tokenBudget: 12000,
    sessionId: options?.sessionId,
    activeTopic: options?.activeTopic,
    currentStage: options?.currentStage,
    protectedAnchorIds: options?.protectedAnchorIds,
    calendarEvents: calendarEvents
  });

  const parts: string[] = [];
  if (assembled.systemLayer) parts.push(assembled.systemLayer);
  if (assembled.continuityLayer) parts.push(assembled.continuityLayer);
  if (assembled.identityLayer) parts.push(assembled.identityLayer);
  if (assembled.roadmapLayer) parts.push(assembled.roadmapLayer);
  if (assembled.semanticLayer) parts.push(assembled.semanticLayer);
  if (assembled.historicalLayer) parts.push(assembled.historicalLayer);
  if (assembled.auxiliaryLayer) parts.push(assembled.auxiliaryLayer);

  return `
USER QUERY: ${userQuery}

${parts.join('\n')}
`.trim();
}
