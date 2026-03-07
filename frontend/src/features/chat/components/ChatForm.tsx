import React, { KeyboardEvent } from 'react';
import { Message } from '../../../types';
import { useChatInput } from '../hooks/useChatInput';
import { Send, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface ChatFormProps {
  /** メッセージ送信時のコールバック */
  onMessageSent: (message: Message) => void;
}

/**
 * クレーマー用チャット入力フォーム
 * @param onMessageSent - メッセージが送信されたときに呼び出される関数
 */
export const ChatForm: React.FC<ChatFormProps> = ({ onMessageSent }) => {
  // カスタムフックを使用してロジックを分離
  const { message, setMessage, sendMessage, isLoading, error } = useChatInput(onMessageSent);

  // Enterキーで送信、Shift+Enterで改行
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // 送信処理
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
        <span>🤬</span> クレーマー入力
      </h2>
      
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        <textarea
          className="flex-1 w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none bg-gray-50 text-gray-800 placeholder-gray-400 transition-all min-h-[120px]"
          placeholder="ここに暴言を入力してください..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        
        {error && (
          <div className="text-red-500 text-sm font-bold bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <button
          onClick={sendMessage}
          disabled={isLoading || !message.trim()}
          className={clsx(
            "flex items-center justify-center py-3 px-6 rounded-lg font-bold text-white transition-all transform",
            isLoading || !message.trim() 
              ? "bg-gray-300 cursor-not-allowed" 
              : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 active:scale-95 shadow-md hover:shadow-lg"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              毒抜き中...
            </>
          ) : (
            <>
              <Send className="mr-2 h-5 w-5" />
              送信 (毒抜き)
            </>
          )}
        </button>
      </div>
    </div>
  );
};
