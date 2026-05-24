import { NextResponse } from 'next/server';
import { getFocusRecommendation } from '@/lib/ai/recommendation/focus-recommendation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const load = parseInt(searchParams.get('load') || '42', 10);
  
  const recommendation = getFocusRecommendation(load);
  return NextResponse.json(recommendation);
}
