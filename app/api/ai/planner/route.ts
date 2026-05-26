import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSettings } from '@/lib/settings/settings';
import { generateGatewayResponse } from '@/lib/ai/gateway/maia_gateway';
import { PLANNER_PROMPT } from '@/lib/ai/prompts/planner';
import { CalendarEvent } from '@/types/calendar';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { events = [], model, aiMode } = await request.json() as { 
      events: CalendarEvent[]; 
      model?: string;
      aiMode?: any;
    };
    
    // Format events list for LLM consumption
    const eventsDescription = events.length > 0 
      ? events.map((e, idx) => `Event [${idx + 1}]: "${e.title}" from ${new Date(e.startTime).toLocaleTimeString()} to ${new Date(e.endTime).toLocaleTimeString()} (${e.description || 'no desc'})`).join('\n')
      : 'No events scheduled for today.';

    const prompt = `Here is my calendar schedule for today:\n${eventsDescription}\n\nPlease analyze my schedule, identify high cognitive load peak intervals, and recommend a specific 90-minute focus block/deep work slot. Avoid any conflicts with existing events. Return your recommendations in JSON format containing:
    {
      "analysis": "Short analysis paragraph of the cognitive load",
      "recommendation": {
        "title": "Title of the recommended focus block",
        "description": "Short explanation of the focus block task",
        "startTime": "Suggested start time in ISO format today (e.g. 2026-05-24T09:00:00.000Z)",
        "endTime": "Suggested end time in ISO format today (e.g. 2026-05-24T10:30:00.000Z)",
        "location": "Localhost"
      }
    }`;

    const settings = await getSettings(user.id);
    const { decrypt } = await import("@/lib/security/encryption");
    const customApiKey = settings.aiApiKey ? decrypt(settings.aiApiKey) : null;

    const gatewayResponse = await generateGatewayResponse(prompt, {
      systemInstruction: PLANNER_PROMPT,
      model: model || settings.aiModel,
      aiMode: aiMode || 'focus', // Default to focus mode for highly logical planning tasks
      customApiKey,
    });

    // Try to parse JSON from the response text
    let parsedData;
    try {
      const jsonMatch = gatewayResponse.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        parsedData = JSON.parse(gatewayResponse.text);
      }
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON, using heuristics', parseError);
      // Heuristic fallback
      parsedData = {
        analysis: gatewayResponse.text,
        recommendation: {
          title: "Deep Work: Core System Integration",
          description: "Sesi alokasi kognitif terfokus untuk integrasi sub-sistem SOPHIA.",
          startTime: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
          endTime: new Date(new Date().setHours(10, 30, 0, 0)).toISOString(),
          location: "Localhost"
        }
      };
    }

    return NextResponse.json(parsedData);

  } catch (error) {
    console.error('Planner AI Route error:', error);
    return NextResponse.json({ error: 'Failed to analyze schedule.' }, { status: 500 });
  }
}
