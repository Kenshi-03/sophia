import { NextResponse } from 'next/server';
import { getMemoryNodesByUser } from '@/lib/db/queries/memory';

export async function GET() {
  const userId = 'user@sophia.local'; // default seed user
  const memories = await getMemoryNodesByUser(userId);
  return NextResponse.json(memories);
}
