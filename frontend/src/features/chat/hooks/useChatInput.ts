import { useState } from 'react';
import { Message } from '../../../types';
import { useSessionId } from '../../session/hooks/useSessionId'; // ブラウザ単位の session_id を取得して顧客識別に使う

interface UseChatInputResult {
  message: string;
  setMessage: (message: string) => void;
  sendMessage: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * チャット入力のロジックを管理するカスタムフック
 * @param onMessageSent - メッセージ送信成功時のコールバック
 */
export const useChatInput = (onMessageSent: (message: Message) => void): UseChatInputResult => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useSessionId(); // localStorage に保存された session_id を取得する（未初期化の間は空文字）

  /**
   * メッセージを送信し、APIから毒抜き結果を取得する
   */
  const sendMessage = async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      if (!sessionId) { // session_id が未確定の間は送信できないためガードする
        throw new Error('session_id is not ready'); // 開発時に原因が分かるように例外で通知する
      } // ガード節をここで閉じる

      // APIリクエスト
      // プロキシ経由でバックエンドにアクセス (/api/convert -> http://localhost:8000/api/convert)
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, session_id: sessionId }), // 顧客識別のため session_id を同梱して送る
      });

      if (!response.ok) {
        throw new Error('Failed to convert message');
      }

      const data = await response.json();

      // メッセージオブジェクトを作成
      const newMessage: Message = {
        id: crypto.randomUUID(),
        original: data.original,
        converted: data.converted,
        replySuggestion: data.replySuggestion,
        timestamp: Date.now(),
        aggressionScore: data.aggressionScore,
      };

      // コールバックを呼び出す
      onMessageSent(newMessage);

      // 入力をクリア
      setMessage('');
    } catch (err) {
      console.error(err);
      setError('メッセージの送信に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    message,
    setMessage,
    sendMessage,
    isLoading,
    error,
  };
};
