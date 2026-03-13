import { useEffect, useState } from 'react'; // ブラウザ単位の session_id を状態として管理するために React Hooks を使う

const STORAGE_KEY = 'session_id'; // localStorage に保存するキー名を定義して typo を防ぐ

/**
 * ブラウザごとに一意な session_id を生成・保持するカスタムフック
 * @returns session_id（未初期化の場合は空文字）
 */
export const useSessionId = (): string => {
  const [sessionId, setSessionId] = useState<string>(''); // session_id を state として保持し、初期値は空にする

  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR 環境では localStorage が無いので何もしない

    const existing = window.localStorage.getItem(STORAGE_KEY); // 既に保存済みの session_id を取得する
    if (existing && existing.trim()) {
      queueMicrotask(() => setSessionId(existing)); // effect 内の同期 setState を避けつつ既存値を state に反映する
      return; // 既存値がある場合は生成処理を行わない
    }

    const created = crypto.randomUUID(); // ブラウザ内で衝突しにくい UUID を生成する
    window.localStorage.setItem(STORAGE_KEY, created); // 次回以降も同じ session_id を使えるよう localStorage に保存する
    queueMicrotask(() => setSessionId(created)); // effect 内の同期 setState を避けつつ生成値を state に反映する
  }, []); // 初回マウント時だけ実行して session_id を確定させる

  return sessionId; // 確定した session_id を返す
};
