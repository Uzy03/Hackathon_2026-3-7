'use client';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type User = { id: string; isAdmin: boolean };
export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stopped, setStopped] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function checkSession() {
    const response = await fetch('/auth/session', { cache: 'no-store' });
    setStopped(response.status === 503);
    setUser(response.ok ? await response.json() : null);
  }
  useEffect(() => {
    let active = true;
    fetch('/auth/session', { cache: 'no-store' }).then(async response => {
      const identity = response.ok ? await response.json() : null;
      if (active) { setUser(identity); setStopped(response.status === 503); }
    }).catch(() => { if (active) setError('サービスに接続できません。'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      if (!response.ok) { setError('ログインできませんでした。'); return; }
      await checkSession();
    } catch { setError('サービスに接続できません。'); }
    finally { setBusy(false); }
  }
  if (loading) return <main className="p-8">読み込み中…</main>;
  if (stopped) return <main className="p-8">このサービスは現在停止しています。</main>;
  if (!user) return <main className="mx-auto max-w-sm p-8">
    <h1 className="mb-4 text-xl">ログイン</h1>
    <form onSubmit={login} className="flex flex-col gap-4">
      <label>メールアドレス<input className="block w-full border p-2" name="email" type="email" autoComplete="username" required /></label>
      <label>パスワード<input className="block w-full border p-2" name="password" type="password" autoComplete="current-password" required /></label>
      <button className="border p-2" disabled={busy}>{busy ? '確認中…' : 'ログイン'}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  </main>;
  if (pathname.startsWith('/admin') && !user.isAdmin) return <main className="p-8">管理者権限が必要です。<a className="underline" href="/client">メッセージ画面へ</a></main>;
  return <><div className="flex justify-end p-2"><button onClick={async () => {
    const response = await fetch('/auth/logout', { method: 'POST' });
    if (response.ok) window.location.reload();
  }}>ログアウト</button></div>{children}</>;
}
