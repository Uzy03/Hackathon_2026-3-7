import { NextRequest } from 'next/server';
import { authClient, cookieOptions, json, readLimitedBody, sameOrigin, serviceEnabled, sessionCookie } from '@/lib/server-auth';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  if (!serviceEnabled()) return json({ detail: '現在このサービスは停止しています。' }, 503);
  if (!sameOrigin(request)) return json({ detail: 'Invalid origin' }, 403);
  let input;
  try { input = JSON.parse(new TextDecoder().decode(await readLimitedBody(request, 4096))); }
  catch { return json({ detail: '入力を確認してください。' }, 400); }
  if (typeof input?.email !== 'string' || typeof input?.password !== 'string'
      || input.email.length > 254 || input.password.length > 1024) return json({ detail: '入力を確認してください。' }, 400);
  try {
    const { data, error } = await authClient().auth.signInWithPassword({ email: input.email, password: input.password });
    if (error || !data.session || data.user?.is_anonymous) return json({ detail: 'ログインできませんでした。' }, 401);
    const response = json({ ok: true });
    response.cookies.set(sessionCookie, data.session.access_token, {
      ...cookieOptions, maxAge: Math.min(data.session.expires_in, 3600),
    });
    return response;
  } catch { return json({ detail: '認証サービスに接続できません。' }, 503); }
}
