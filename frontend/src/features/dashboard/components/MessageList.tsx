import React, { useEffect, useState } from 'react'; // 初期ロードで履歴取得するため useEffect/useState を使う
import { Message } from '../../../types'; // 表示するメッセージ型を参照する
import { User, Bot } from 'lucide-react'; // アイコン表示に利用する

interface MessageListProps {
  /** 表示するメッセージのリスト */
  messages: Message[];
  /** ブラウザ単位の session_id（履歴取得に使用） */
  sessionId: string;
  /** 履歴取得成功時に親 state を更新するためのコールバック */
  onHistoryLoaded: (messages: Message[]) => void;
}

/**
 * 毒抜きされたメッセージを表示するリストコンポーネント
 * 工務店側が見る画面
 * @param messages - メッセージ配列
 * @param sessionId - 顧客識別用の session_id
 * @param onHistoryLoaded - 履歴ロード完了時のコールバック
 */
export const MessageList: React.FC<MessageListProps> = ({ messages, sessionId, onHistoryLoaded }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false); // 履歴取得中かどうかを state で管理する
  const [loadError, setLoadError] = useState<string | null>(null); // 履歴取得の失敗を state で管理する

  useEffect(() => {
    if (!sessionId) return; // session_id が未確定の間は履歴を取得できないため何もしない

    let cancelled = false; // アンマウント後の state 更新を避けるためのフラグを用意する

    const loadHistory = async () => {
      setIsLoading(true); // ローディング開始を反映する
      setLoadError(null); // 前回のエラーをクリアする

      try {
        const response = await fetch(`/backend-api/messages?session_id=${encodeURIComponent(sessionId)}`); // session_id をクエリに含めて履歴を取得する
        if (!response.ok) { // HTTP エラーの場合は例外にして catch へ集約する
          throw new Error('Failed to load history'); // 失敗理由をデバッグしやすい文字列で通知する
        } // if ブロックをここで閉じる

        const data: Array<{ id: string; original: string; converted: string; aggressionScore: number; createdAt: string }> = await response.json(); // API の JSON 配列を取得する
        const mapped: Message[] = data.map((item) => ({ // UI 表示用の Message 形式へ変換する
          id: item.id, // DB の messages.id をそのまま UI の key に使う
          original: item.original, // 元文を反映する
          converted: item.converted, // 変換後文を反映する
          timestamp: Number.isFinite(Date.parse(item.createdAt)) ? Date.parse(item.createdAt) : Date.now(), // createdAt を timestamp に変換して既存UIと整合させる
          aggressionScore: item.aggressionScore, // スコアを反映する
        })); // map の変換定義をここで閉じる

        if (cancelled) return; // アンマウント済みなら state 更新や親更新を行わない
        onHistoryLoaded(mapped); // 親コンポーネントに履歴を渡して一覧表示へ反映する
      } catch (err) {
        if (cancelled) return; // アンマウント済みなら state 更新を行わない
        console.error(err); // 開発時の原因追跡のためにコンソールへ出す
        setLoadError('履歴の取得に失敗しました。'); // UI 上に分かりやすいエラーメッセージを表示する
      } finally {
        if (cancelled) return; // アンマウント済みなら state 更新を行わない
        setIsLoading(false); // ローディング終了を反映する
      }
    };

    loadHistory(); // 初期ロード時に履歴取得を開始する

    return () => {
      cancelled = true; // 以後の非同期完了時に state 更新しないようにする
    };
  }, [sessionId, onHistoryLoaded]);

  return (
    <div className="flex flex-col h-full bg-white p-6 rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <h2 className="text-xl font-bold mb-4 text-green-700 flex items-center gap-2">
        <span>👷</span> 工務店ダッシュボード
      </h2>
      
      {loadError && (
        <div className="mb-3 text-red-500 text-sm font-bold bg-red-50 p-2 rounded">
          {loadError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            {isLoading ? '履歴を読み込み中...' : 'メッセージはまだありません'}
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="bg-gray-50 rounded-lg p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* 元のメッセージ（デバッグ用・あるいは折りたたみ表示用） */}
              <div className="flex items-start gap-2 mb-2 text-xs text-gray-400 border-b border-gray-200 pb-2">
                <User className="w-3 h-3 mt-0.5" />
                <p className="line-clamp-1 italic">{`"${msg.original}"`}</p>
                <span className="ml-auto text-[10px] bg-red-100 text-red-600 px-1 rounded">
                  Lv.{(msg.aggressionScore * 100).toFixed(0)}
                </span>
              </div>
              
              {/* 毒抜き後のメッセージ */}
              <div className="flex items-start gap-3">
                <div className="bg-green-100 p-2 rounded-full text-green-600 flex-shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 font-medium leading-relaxed">
                    {msg.converted}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
