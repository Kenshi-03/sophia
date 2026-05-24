import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { getUserSchedule } from '@/lib/db/queries/schedule';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = session.user.email;
    const dbUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!dbUser) {
      return NextResponse.json({ events: [] });
    }

    const events = await getUserSchedule(dbUser.id);
    return NextResponse.json({
      startOfWeek: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      events,
    });
  } catch (error) {
    console.error('Failed to get weekly schedule:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
