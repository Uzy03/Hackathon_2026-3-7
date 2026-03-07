import { useState } from 'react';
import { Message } from '../../../types';

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

  /**
   * メッセージを送信し、APIから毒抜き結果を取得する
   */
  const sendMessage = async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // APIリクエスト
      const response = await fetch('http://localhost:3001/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
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
