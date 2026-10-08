import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const sessionCookie = process.env.NODE_ENV === 'production'
  ? '__Host-hackathon_session' : 'hackathon_session';
export const cookieOptions = {
  httpOnly: true, secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, path: '/',
};
export const serviceEnabled = () => process.env.APP_ENABLED === 'true';
export const sameOrigin = (request: NextRequest) =>
  request.headers.get('origin') === request.nextUrl.origin;

export function authClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Authentication is not configured');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function readLimitedBody(request: NextRequest, limit = 16384) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) {
      await reader.cancel();
      throw new Error('Request body too large');
    }
    chunks.push(value);
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  return body;
}
