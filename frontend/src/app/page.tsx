import Link from 'next/link';

/**
 * ルート画面
 * 単一デプロイ（Vercel 1プロジェクト）で /admin と /client に入れるようにする
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800">毒抜きAI</h1>
        <p className="text-gray-500 mt-2">/client と /admin を同一アプリで提供します。</p>
      </header>

      <main className="max-w-2xl mx-auto grid grid-cols-1 gap-4">
        <Link
          href="/client"
          className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow"
        >
          <h2 className="text-xl font-bold text-red-600 mb-1">工務店チャット</h2>
          <p className="text-gray-500 text-sm">入力して送信すると工務店（AI）が返信します。</p>
        </Link>

        <Link
          href="/admin"
          className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow"
        >
          <h2 className="text-xl font-bold text-green-700 mb-1">工務店ダッシュボード</h2>
          <p className="text-gray-500 text-sm">顧客一覧と会話履歴を確認します。</p>
        </Link>
      </main>
    </div>
  );
}
