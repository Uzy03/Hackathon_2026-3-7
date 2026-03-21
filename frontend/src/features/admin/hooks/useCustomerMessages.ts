import { useEffect, useState } from 'react'; // 顧客別履歴の取得と状態管理のための Hooks を読み込む
import { CustomerMessageRecord } from '../types'; // 顧客別履歴の型を参照する

type UseCustomerMessagesResult = { // フックの戻り値を型で固定する
  messages: CustomerMessageRecord[]; // 顧客別履歴を返す
  isLoading: boolean; // ローディング状態を返す
  error: string | null; // エラーメッセージを返す
}; // 戻り値型定義をここで閉じる

/**
 * 工務店画面で選択顧客の履歴を取得するフック
 * @param customerId - 選択中の顧客ID
 * @returns 履歴・ローディング・エラー
 */
export const useCustomerMessages = (customerId: string | null): UseCustomerMessagesResult => {
  const [messages, setMessages] = useState<CustomerMessageRecord[]>([]); // 取得した履歴を保持する
  const [isLoading, setIsLoading] = useState<boolean>(false); // ローディング状態を保持する
  const [error, setError] = useState<string | null>(null); // エラー状態を保持する

  useEffect(() => {
    if (!customerId) {
      setMessages([]); // 顧客未選択時は履歴を空にする
      setError(null); // 顧客未選択時はエラーもクリアする
      setIsLoading(false); // 顧客未選択時はローディングもしない
      return;
    }

    const controller = new AbortController(); // 顧客切替時に前回の通信を中断できるようにする

    const load = async () => {
      setIsLoading(true); // 読み込み開始を反映する
      setError(null); // 前回のエラーをクリアする

      try {
        const response = await fetch(`/backend-api/customers/${encodeURIComponent(customerId)}/messages`, { signal: controller.signal }); // 顧客IDで履歴を取得する
        if (!response.ok) throw new Error('Failed to load customer messages'); // HTTP エラーは例外にして catch へ集約する

        const data = (await response.json()) as CustomerMessageRecord[]; // JSON を型付き配列として受け取る
        setMessages(Array.isArray(data) ? data : []); // 想定外の形でも UI が落ちないように配列へ正規化する
      } catch (err) {
        if (controller.signal.aborted) return; // 中断時はエラー表示をしない
        console.error(err); // 開発時に原因が追えるようにコンソールへ出す
        setError('顧客の履歴取得に失敗しました。'); // ユーザー向けのエラーメッセージを state に入れる
        setMessages([]); // 失敗時は履歴を空にして表示を明確にする
      } finally {
        if (controller.signal.aborted) return; // 中断時は state 更新を避ける
        setIsLoading(false); // 読み込み終了を反映する
      }
    };

    load(); // customerId が変わったタイミングで履歴を取得する

    return () => controller.abort(); // 顧客切替/アンマウント時に通信を中断する
  }, [customerId]); // customerId の変更に追従して再取得する

  return { messages, isLoading, error }; // 画面に必要な状態を返す
};
