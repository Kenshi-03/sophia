import { NextResponse } from 'next/server';
import { listCalendarEvents } from '@/lib/google/calendar';

export async function GET(request: Request) {
  try {
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
