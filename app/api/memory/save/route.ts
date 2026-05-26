import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { savePermanentMemory } from '@/lib/ai/memory/save-memory';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, category, tags = [] } = await request.json();
    if (!content || !category) {
      return NextResponse.json({ error: 'Content and category are required.' }, { status: 400 });
    }
    
    const node = await savePermanentMemory(user.id, content, category, tags);
    return NextResponse.json(node);
  } catch (error) {
    console.error('Failed to save memory fact:', error);
    return NextResponse.json({ error: 'Failed to save permanent memory fact.' }, { status: 500 });
  }
}
