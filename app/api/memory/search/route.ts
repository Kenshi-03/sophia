import { NextResponse } from 'next/server';
import { retrieveRelevantMemories } from '@/lib/ai/memory/retrieve-memory';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'default-user-id';
  const query = searchParams.get('query') || '';
  
  const memories = await retrieveRelevantMemories(userId, query);
  return NextResponse.json(memories);
}
