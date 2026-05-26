import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getFocusRecommendation } from '@/lib/ai/recommendation/focus-recommendation';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const load = parseInt(searchParams.get('load') || '42', 10);
  
  const recommendation = getFocusRecommendation(load);
  return NextResponse.json(recommendation);
}
