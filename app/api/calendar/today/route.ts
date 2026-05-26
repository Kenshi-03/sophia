import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserSchedule } from '@/lib/db/queries/schedule';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const events = await getUserSchedule(user.id);
    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to get today schedule:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
