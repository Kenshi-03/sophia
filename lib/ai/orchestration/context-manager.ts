import { buildMemoryContext } from '../memory/context-builder';

export function assembleAgentContext(
  userQuery: string,
  memories: any[],
  calendarEvents: any[]
): string {
  const memoryCtx = buildMemoryContext(memories);
  const calendarCtx = calendarEvents
    .map((e, i) => `Event [${i + 1}]: ${e.title} (${e.startTime} to ${e.endTime})`)
    .join('\n');
    
  return `
USER QUERY: ${userQuery}

---- RETRIEVED MEMORY ----
${memoryCtx}

---- RECENT SCHEDULE EVENTS ----
${calendarCtx || 'No events scheduled.'}
`;
}
