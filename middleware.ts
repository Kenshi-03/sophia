import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Lightweight Edge-compatible memory cache for IP rate limiting
const ipCache = new Map<string, { count: number; expiresAt: number }>();

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Only apply rate limiting to API routes, excluding auth
  if (path.startsWith('/api') && !path.startsWith('/api/auth')) {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const now = Date.now();
    const WINDOW_MS = 60 * 1000; // 1 minute
    const LIMIT = 100; // Max 100 requests per minute per IP

    // Lazy cleanup of cache map when it gets too large to prevent memory leaks
    if (ipCache.size > 10000) {
      for (const [key, value] of ipCache.entries()) {
        if (now > value.expiresAt) {
          ipCache.delete(key);
        }
      }
    }

    const cached = ipCache.get(ip);

    if (!cached || now > cached.expiresAt) {
      ipCache.set(ip, { count: 1, expiresAt: now + WINDOW_MS });
    } else {
      cached.count += 1;
      if (cached.count > LIMIT) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again in a minute.' },
          { status: 429 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
