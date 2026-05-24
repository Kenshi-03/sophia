import { NextResponse } from 'next/server';

export async function GET() {
  // Returns mock events list for today
  return NextResponse.json([
    { id: '1', title: 'Morning Lecture Prep', startTime: '09:00 AM', endTime: '10:30 AM' },
    { id: '2', title: 'SOPHIA Dev Sprint', startTime: '02:00 PM', endTime: '04:00 PM' },
  ]);
}
