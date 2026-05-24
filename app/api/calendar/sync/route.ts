import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { listCalendarEvents } from '@/lib/google/calendar';
import { formatGoogleEvent } from '@/lib/google/formatter';
import { upsertUserSchedule } from '@/lib/db/queries/schedule';
import { mockEvents } from '@/lib/db/mocks';
import { CalendarEvent } from '@/types/calendar';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = session.user.email;

    // Retrieve user and their Google Account tokens from database
    const dbUser = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: {
          where: { provider: 'google' }
        }
      }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const googleAccount = dbUser.accounts[0];
    const accessToken = googleAccount?.access_token;

    if (!accessToken) {
      console.warn('Google Access Token not found. Seeding local mock events.');
      // Map mock events for database seeding
      const seededEvents: CalendarEvent[] = mockEvents.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        startTime: new Date(e.startTime).toISOString(),
        endTime: new Date(e.endTime).toISOString(),
        location: e.location || null,
      }));

      await upsertUserSchedule(dbUser.id, seededEvents);

      return NextResponse.json({
        success: true,
        mode: 'local',
        message: 'Google Calendar synchronization simulated using local mocks.',
      });
    }

    // Retrieve actual events from Google
    const googleEvents = await listCalendarEvents(accessToken);
    const formattedEvents: CalendarEvent[] = googleEvents.map(e => {
      const formatted = formatGoogleEvent(e);
      return {
        id: formatted.id,
        title: formatted.title,
        description: formatted.description,
        startTime: formatted.startTime.toISOString(),
        endTime: formatted.endTime.toISOString(),
        location: formatted.location || null,
      };
    });

    // Upsert formatted events to PostgreSQL database
    await upsertUserSchedule(dbUser.id, formattedEvents);

    return NextResponse.json({
      success: true,
      mode: 'cloud',
      message: `Successfully synchronized ${formattedEvents.length} events from Google Calendar.`,
    });

  } catch (error) {
    console.error('Calendar sync error:', error);
    return NextResponse.json({ error: 'Synchronization failed' }, { status: 500 });
  }
}
