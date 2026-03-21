import React, { useState } from 'react'; // 履歴一覧を定義するために React と State を読み込む
import { CustomerMessageRecord } from '../types'; // 履歴の型を参照する
import { MascotDisplay } from '../../mascot/components/MascotDisplay'; // 警告モーダル用にマスコット表示コンポーネントを読み込む

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
  const [showOriginalIds, setShowOriginalIds] = useState<Set<string>>(new Set());
  const [confirmingMessageId, setConfirmingMessageId] = useState<string | null>(null);

  const handleShowOriginal = (id: string) => {
    setConfirmingMessageId(null);
    setShowOriginalIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3 pr-2">
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
              <div className="flex gap-2">
                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded">
                  怒り Lv.{Math.round(m.aggressionScore * 100)}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${m.urgency >= 4 ? 'bg-red-500 text-white' : m.urgency >= 3 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                  緊急度 {m.urgency}
                </span>
              </div>
            </div>
            <div className="space-y-3 w-full">
              {showOriginalIds.has(m.id) && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-2 shadow-sm bg-red-50 text-red-800 border border-violet-200">
                    <p className="text-[11px] font-bold text-red-600 mb-1">クライアントの入力（原文）</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-bold">{m.original}</p>
                  </div>
                </div>
              )}
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-4 py-2 shadow-sm bg-white text-gray-800 border border-gray-200 relative group">
                  <p className="text-[11px] font-bold text-gray-500 mb-1">顧客の要望（毒抜き済み）</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap pb-4">{m.converted}</p>
                  {!showOriginalIds.has(m.id) && (
                    <button
                      onClick={() => setConfirmingMessageId(m.id)}
                      className="absolute bottom-2 right-2 px-2 py-0.5 bg-gray-50 hover:bg-gray-200 text-gray-500 hover:text-gray-700 text-[10px] font-bold rounded border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                    >
                      原文を見る
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-4 py-2 shadow-sm bg-blue-50 text-gray-800 border border-blue-200">
                  <p className="text-xs text-blue-600 mb-1">AI 返信案</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.replySuggestion || '（返信案なし）'}</p>
                </div>
              </div>
            </div>
          </div>
        ))
      )}

      {confirmingMessageId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-sm w-full p-6 relative animate-in fade-in zoom-in duration-200">
            <h3 className="text-center font-bold text-red-600 text-lg mb-4">警告</h3>
            <div className="flex justify-center mb-4">
              <div className="w-32 h-32 relative">
                <MascotDisplay aggressionLevel={0.9} isLoading={false} showFrame={false} showStatus={false} />
              </div>
            </div>
            <p className="text-center font-bold text-gray-800 text-sm mb-6 leading-relaxed">
              本当に原文を表示していいまもか？<br/>
              <span className="text-xs text-gray-500 font-normal mt-2 block">（強い言葉が含まれている可能性があるまも）</span>
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setConfirmingMessageId(null)}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-sm transition-colors"
              >
                やめる
              </button>
              <button 
                onClick={() => handleShowOriginal(confirmingMessageId)}
                className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-sm shadow-sm transition-colors"
              >
                見る
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
