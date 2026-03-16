import React, { useEffect, useRef } from 'react'; // スクロール制御のため useEffect/useRef を使う
import { Message } from '../../../types'; // 表示対象の Message 型を参照する
import clsx from 'clsx'; // バブルの見た目を条件で切り替えるために clsx を使う

type ClientChatTimelineProps = { // タイムライン表示に必要な props を型で固定する
  messages: Message[]; // 表示するメッセージ一覧を受け取る
  isHistoryLoading: boolean; // 履歴取得中かどうかを受け取る
}; // props 型定義をここで閉じる

/**
 * LINE風チャットのメッセージ一覧
 * @param messages - 送信済みメッセージ一覧
 * @param isHistoryLoading - 履歴取得中フラグ
 */
export const ClientChatTimeline: React.FC<ClientChatTimelineProps> = ({ messages, isHistoryLoading }) => {
  const bottomRef = useRef<HTMLDivElement | null>(null); // 最下部へ自動スクロールするための参照を保持する

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); // 新規メッセージ追加時に最下部へスクロールする
  }, [messages.length]); // メッセージ数が増減したタイミングでスクロールする

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gradient-to-b from-gray-50 to-gray-100">
      {isHistoryLoading && messages.length === 0 && (
        <div className="text-center text-sm text-gray-400">履歴を読み込み中...</div>
      )}

      {messages.map((msg) => (
        <div key={msg.id} className="space-y-2">
          <div className="flex justify-end">
            <div className={clsx('max-w-[80%] rounded-2xl px-4 py-2 shadow-sm', 'bg-red-500 text-white')}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.original}</p>
            </div>
          </div>

          <div className="flex justify-start space-x-2">
            <div className={clsx('max-w-[48%] rounded-2xl px-4 py-2 shadow-sm border', 'bg-white text-gray-800 border-gray-200')}>
              <p className="text-xs text-blue-500 mb-1">工務店（AI返信案）</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.replySuggestion || '（返信案がありません）'}</p>
            </div>
          </div>
        </div>
      ))}

      <div ref={bottomRef} />
    </div>
  );
};
