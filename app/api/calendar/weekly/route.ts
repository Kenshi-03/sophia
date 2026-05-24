import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    startOfWeek: 'May 18, 2026',
    events: [
      { id: '1', title: 'SOPHIA Dev Sprint', startTime: '02:00 PM', duration: '120m', location: 'Localhost' },
    ],
  });
}
