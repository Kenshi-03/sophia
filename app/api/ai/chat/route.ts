import { NextResponse } from 'next/server';
import { routeUserQuery } from '@/lib/ai/orchestration/ai-router';
import { assembleAgentContext } from '@/lib/ai/orchestration/context-manager';
import { generateAiResponse } from '@/lib/ai/orchestration/response-generator';
import { retrieveRelevantMemories } from '@/lib/ai/memory/retrieve-memory';

export async function POST(request: Request) {
  try {
    const { query, userId = 'default-user-id', model, aiMode } = await request.json();
    if (!query) {
      return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
    }

    // AI agent routing
    const agentType = routeUserQuery(query);

    // Retrieve contextual memories
    const relevantMemories = await retrieveRelevantMemories(userId, query);

    // Assemble LLM context payload
    const context = assembleAgentContext(query, relevantMemories, []);

    // Generate output utilizing MAIA gateway and passing model/mode parameters
    const response = await generateAiResponse(query, context, { model, aiMode });

    return NextResponse.json({
      query,
      agentType,
      response,
    });
  } catch (error) {
    console.error('AI chat endpoint error:', error);
    return NextResponse.json({ error: 'Internal system error.' }, { status: 500 });
  }
}
