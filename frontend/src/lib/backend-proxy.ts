import { NextRequest } from 'next/server';
import { json, readLimitedBody, sameOrigin, serviceEnabled, sessionCookie } from './server-auth';

export type HandlerContext = { params: Promise<{ path: string[] }> };

export async function proxyBackend(request: NextRequest, context: HandlerContext): Promise<Response> {
  if (!serviceEnabled()) return json({ detail: '現在このサービスは停止しています。' }, 503);
  const cookie = request.cookies.get(sessionCookie)?.value;
  const authorization = cookie ? `Bearer ${cookie}` : request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ detail: 'ログインが必要です。' }, 401);
  const method = request.method.toUpperCase();
  if (cookie && method !== 'GET' && !sameOrigin(request)) return json({ detail: 'Invalid origin' }, 403);
  const { path } = await context.params;
  if (!path.every(segment => /^[A-Za-z0-9_-]+$/.test(segment))) return json({ detail: 'Not found' }, 404);
  const route = path.join('/');
  const allowed = (method === 'GET' && /^(me|messages|customers|stats\/customers|customers\/[A-Za-z0-9_-]+\/messages)$/.test(route))
    || (method === 'POST' && route === 'convert')
    || (method === 'PATCH' && /^customers\/[A-Za-z0-9_-]+$/.test(route));
  if (!allowed) return json({ detail: 'Not found' }, 404);
  const base = process.env.BACKEND_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:8000' : '');
  if (!base) return json({ detail: 'サービスが設定されていません。' }, 503);
  let body: Uint8Array | undefined;
  try { if (method !== 'GET') body = await readLimitedBody(request); }
  catch { return json({ detail: 'Request body too large' }, 413); }
  try {
    const url = new URL(`${base.replace(/\/$/, '')}/api/${route}`);
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      return json({ detail: 'サービスが設定されていません。' }, 503);
    }
    url.search = request.nextUrl.search;
    const response = await fetch(url, {
      method, headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      body: body ? Buffer.from(body) : undefined,
      cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(60000),
    });
    // Never forward upstream cookies, redirects, or cacheable customer data.
    if (response.status >= 300 && response.status < 400) return json({ detail: 'Upstream error' }, 502);
    const headers = new Headers({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json' });
    for (const name of ['Retry-After', 'WWW-Authenticate']) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers });
  } catch { return json({ detail: 'サービスに接続できません。' }, 502); }
}
