import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getGoogleAuthUrl } from '@/lib/google/oauth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = getGoogleAuthUrl();
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate OAuth redirect link.' }, { status: 500 });
  }
}
