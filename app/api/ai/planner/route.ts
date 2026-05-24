import { NextResponse } from 'next/server';
import { generateDailyPlan } from '@/lib/ai/recommendation/daily-plan';

export async function POST(request: Request) {
  try {
    const { userId = 'default-user-id', events = [] } = await request.json();
    const plan = await generateDailyPlan(userId, events);
    return NextResponse.json(plan);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate daily plan.' }, { status: 500 });
  }
}
