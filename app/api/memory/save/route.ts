import { NextResponse } from 'next/server';
import { savePermanentMemory } from '@/lib/ai/memory/save-memory';

export async function POST(request: Request) {
  try {
    const { userId = 'default-user-id', content, category, tags = [] } = await request.json();
    if (!content || !category) {
      return NextResponse.json({ error: 'Content and category are required.' }, { status: 400 });
    }
    
    const node = await savePermanentMemory(userId, content, category, tags);
    return NextResponse.json(node);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save permanent memory fact.' }, { status: 500 });
  }
}
