import { NextRequest } from 'next/server';
import { cookieOptions, json, sameOrigin, sessionCookie } from '@/lib/server-auth';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ detail: 'Invalid origin' }, 403);
  const response = json({ ok: true });
  response.cookies.set(sessionCookie, '', { ...cookieOptions, maxAge: 0 });
  return response;
}
