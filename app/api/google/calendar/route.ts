import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { listCalendarEvents } from '@/lib/google/calendar';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required.' }, { status: 400 });
    }
    
    const events = await listCalendarEvents(token);
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve Google Calendar events.' }, { status: 500 });
  }
}
