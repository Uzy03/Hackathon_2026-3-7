import { useCallback, useEffect, useState } from 'react'; // 顧客一覧の取得と状態管理のための Hooks を読み込む
import { CustomerListItem } from '../types'; // 顧客一覧の型を参照する

type UseCustomersResult = { // フックの戻り値を型で固定する
  customers: CustomerListItem[]; // 顧客一覧を返す
  isLoading: boolean; // ローディング状態を返す
  error: string | null; // エラーメッセージを返す
  reload: () => Promise<void>; // 再読み込み関数を返す
}; // 戻り値型定義をここで閉じる

/**
 * 工務店画面の顧客一覧を取得するフック
 * @returns 顧客一覧・ローディング・エラー・再読み込み関数
 */
export const useCustomers = (): UseCustomersResult => {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]); // 取得した顧客一覧を保持する
  const [isLoading, setIsLoading] = useState<boolean>(false); // ローディング状態を保持する
  const [error, setError] = useState<string | null>(null); // エラー状態を保持する

  const reload = useCallback(async () => {
    setIsLoading(true); // 読み込み開始を反映する
    setError(null); // 前回のエラーをクリアする

    try {
      const response = await fetch('/api/customers'); // 顧客一覧を取得する
      if (!response.ok) throw new Error('Failed to load customers'); // HTTP エラーは例外にして catch へ集約する

      const data = (await response.json()) as CustomerListItem[]; // API の JSON を型付き配列として受け取る
      setCustomers(Array.isArray(data) ? data : []); // 想定外の形でも UI が落ちないように配列へ正規化する
    } catch (err) {
      console.error(err); // 開発時に原因が追えるようにコンソールへ出す
      setError('顧客一覧の取得に失敗しました。'); // ユーザー向けのエラーメッセージを state に入れる
      setCustomers([]); // 失敗時は一覧を空にして表示を明確にする
    } finally {
      setIsLoading(false); // 読み込み終了を反映する
    }
  }, []); // 外部依存が無いので関数参照を固定する

  useEffect(() => {
    reload(); // 初期ロードで顧客一覧を取得する
  }, [reload]); // reload の参照が変わらない前提で依存に入れる

  return { customers, isLoading, error, reload }; // 画面に必要な状態と操作を返す
};
