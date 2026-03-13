import React from 'react'; // 履歴一覧を定義するために React を読み込む
import { CustomerMessageRecord } from '../types'; // 履歴の型を参照する

type CustomerMessageTimelineProps = { // 履歴一覧が受け取る props を型で固定する
  messages: CustomerMessageRecord[]; // 表示する履歴一覧を受け取る
  isLoading: boolean; // ローディング状態を受け取る
  error: string | null; // エラー文言を受け取る
}; // props 型定義をここで閉じる

/**
 * 工務店画面の顧客別メッセージ履歴一覧
 * @param messages - 履歴一覧
 * @param isLoading - ローディング状態
 * @param error - エラー文言
 */
export const CustomerMessageTimeline: React.FC<CustomerMessageTimelineProps> = ({ messages, isLoading, error }) => {
  const ordered = [...messages].reverse(); // API は新しい順なので UI は古い順に並べ替える

  return (
    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
      {error && <div className="text-sm font-bold text-red-500 bg-red-50 p-2 rounded">{error}</div>}

      {isLoading && messages.length === 0 ? (
        <div className="text-center text-sm text-gray-400 py-6">読み込み中...</div>
      ) : ordered.length === 0 ? (
        <div className="text-center text-sm text-gray-400 py-6">履歴がありません</div>
      ) : (
        ordered.map((m) => (
          <div key={m.id} className="bg-gray-50 rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-gray-400">{new Date(m.createdAt).toLocaleString()}</p>
              <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded">
                Lv.{Math.round(m.aggressionScore * 100)}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-4 py-2 shadow-sm bg-white text-gray-800 border border-gray-200">
                  <p className="text-xs text-gray-400 mb-1">クライアント</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.original}</p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-4 py-2 shadow-sm bg-green-50 text-gray-800 border border-green-100">
                  <p className="text-xs text-gray-400 mb-1">工務店（AI）</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.converted}</p>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
