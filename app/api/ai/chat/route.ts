import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSettings } from '@/lib/settings/settings';
import { routeUserQuery } from '@/lib/ai/orchestration/ai-router';
import { assembleAgentContext } from '@/lib/ai/orchestration/context-manager';
import { generateAiResponse } from '@/lib/ai/orchestration/response-generator';
import { retrieveRelevantMemories } from '@/lib/ai/memory/retrieve-memory';
import { getUserSchedule } from '@/lib/db/queries/schedule';

import { decrypt } from '@/lib/security/encryption';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, model, aiMode } = await request.json();
    if (!query) {
      return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
    }

    // AI agent routing
    const agentType = routeUserQuery(query);

    // Retrieve contextual memories
    const relevantMemories = await retrieveRelevantMemories(user.id, query);

    // Fetch user schedule/events (resolves empty context bug)
    const events = await getUserSchedule(user.id);

    // Assemble LLM context payload
    const context = assembleAgentContext(query, relevantMemories, events);

    // Retrieve user settings for API Key & Model defaults
    const settings = await getSettings(user.id);
    const customApiKey = settings.aiApiKey ? decrypt(settings.aiApiKey) : null;

    // Generate output utilizing MAIA gateway and passing model/mode parameters
    const response = await generateAiResponse(query, context, { 
      model: model || settings.aiModel, 
      aiMode: aiMode || (settings.aiMode as any), 
      customApiKey 
    });

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
