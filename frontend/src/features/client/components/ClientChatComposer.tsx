import React, { KeyboardEvent } from 'react'; // Enter 送信などキーハンドリングのために React を使う
import clsx from 'clsx'; // 入力状態に応じてクラスを切り替えるために clsx を使う
import { Loader2, Send } from 'lucide-react'; // 送信アイコンとローディングアイコンを表示する
import { Message } from '../../../types'; // 送信完了時コールバックの型として Message を参照する
import { useChatInput } from '../../chat/hooks/useChatInput'; // 既存の送信ロジックを流用して SRP を守る

type ClientChatComposerProps = { // 入力欄が受け取る props を型で固定する
  onMessageSent: (message: Message) => void; // 送信完了時に親へ通知する
  errorMessage: string | null; // 履歴取得エラーなどを表示するために受け取る
  onLoadingChange?: (isLoading: boolean) => void; // ローディング状態の変化を親に通知する
}; // props 型定義をここで閉じる

/**
 * LINE風チャットの入力欄
 * @param onMessageSent - 送信完了時のコールバック
 * @param errorMessage - 画面全体のエラー表示
 * @param onLoadingChange - ローディング状態の変化を通知するコールバック
 */
export const ClientChatComposer: React.FC<ClientChatComposerProps> = ({ onMessageSent, errorMessage, onLoadingChange }) => {
  const { message, setMessage, sendMessage, isLoading, error } = useChatInput(onMessageSent); // 送信処理をフックに委譲する

  // ローディング状態の変化を親に通知
  React.useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      {(errorMessage || error) && (
        <div className="mb-2 text-red-500 text-xs font-bold bg-red-50 p-2 rounded">
          {errorMessage || error}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
          placeholder="メッセージを入力..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />

        <button
          onClick={sendMessage}
          disabled={isLoading || !message.trim()}
          className={clsx(
            'h-[44px] px-4 rounded-xl font-bold text-white flex items-center justify-center transition-all',
            isLoading || !message.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 active:scale-95',
          )}
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
};
