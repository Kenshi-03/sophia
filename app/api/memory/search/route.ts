import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { retrieveRelevantMemories } from '@/lib/ai/memory/retrieve-memory';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || '';
  
  const memories = await retrieveRelevantMemories(user.id, query);
  return NextResponse.json(memories);
}
