import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getMemoryNodesByUser } from '@/lib/db/queries/memory';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const memories = await getMemoryNodesByUser(user.id);
  return NextResponse.json(memories);
}
