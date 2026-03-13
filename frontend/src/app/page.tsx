import { redirect } from 'next/navigation';

/**
 * ルート画面
 * port 別に /admin または /client へ誘導する
 */
export default function Home() {
  const mode = process.env.NEXT_PUBLIC_APP_MODE;
  if (mode === 'client') redirect('/client');
  redirect('/admin');
}
