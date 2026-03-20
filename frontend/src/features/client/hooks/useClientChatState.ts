import { useCallback, useEffect, useMemo, useState } from 'react'; // 履歴ロードとチャット状態を管理するための Hooks を読み込む
import { Message } from '../../../types'; // 既存の Message 型をチャット表示にも流用する
import { useSessionId } from '../../session/hooks/useSessionId'; // ブラウザ単位の session_id を取得して顧客識別に使う

type HistoryResponseItem = { // /api/messages が返す 1 要素の形を型で固定する
  id: string; // messages.id を受け取る
  original: string; // 元文を受け取る
  converted: string; // 変換後文を受け取る
  replySuggestion?: string; // 返信案を受け取る
  aggressionScore: number; // 攻撃性スコアを受け取る
  createdAt: string; // 作成日時（ISO 文字列）を受け取る
}; // 型定義をここで閉じる

type UseClientChatStateResult = { // クレーマー画面が必要とする状態と操作をまとめた戻り値型
  sessionId: string; // ブラウザ単位の session_id を返す
  messages: Message[]; // 画面に表示するメッセージ一覧を返す
  aggressionLevel: number; // マスコット演出に使う攻撃性レベルを返す
  isHistoryLoading: boolean; // 履歴取得中かどうかを返す
  historyError: string | null; // 履歴取得のエラーを返す
  onMessageSent: (message: Message) => void; // 送信完了時に state へ反映する関数を返す
}; // 戻り値型をここで閉じる

/**
 * クレーマー画面のチャット状態（履歴 + 新規送信）を管理する
 * @returns クレーマー画面に必要な state と操作群
 */
export const useClientChatState = (): UseClientChatStateResult => {
  const sessionId = useSessionId(); // localStorage の session_id を取得する
  const [messages, setMessages] = useState<Message[]>([]); // 履歴 + 新規送信分をまとめて保持する
  const [aggressionLevel, setAggressionLevel] = useState<number>(0); // 最後のスコアをマスコットへ反映する
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false); // 履歴取得中かどうかを管理する
  const [historyError, setHistoryError] = useState<string | null>(null); // 履歴取得エラーを管理する

  const onMessageSent = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]); // チャットは時系列（下に増える）で表示するため末尾に追加する
    setAggressionLevel(message.aggressionScore); // 直近メッセージのスコアをマスコットへ反映する
  }, []); // 依存が無いので関数参照を固定する

  const hasMessages = useMemo(() => messages.length > 0, [messages.length]); // 履歴上書きの判定を軽量に行う

  useEffect(() => {
    if (!sessionId) return; // session_id が未確定の間は履歴を取得できないため何もしない
    if (hasMessages) return; // 既に表示用メッセージがある場合は二重ロードを避ける

    const controller = new AbortController(); // コンポーネント破棄時に fetch を中断できるようにする

    const loadHistory = async () => {
      setIsHistoryLoading(true); // ローディング開始を反映する
      setHistoryError(null); // 前回エラーをクリアする

      try {
        const response = await fetch(`/backend-api/messages?session_id=${encodeURIComponent(sessionId)}`, { signal: controller.signal }); // session_id で履歴を取得する
        if (!response.ok) throw new Error('Failed to load history'); // HTTP エラーは例外にして catch へ集約する

        const data: HistoryResponseItem[] = (await response.json()) as HistoryResponseItem[]; // JSON を期待する配列として受け取る
        const mapped: Message[] = data
          .slice() // in-place sort の副作用を避けるためコピーする
          .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)) // 古い順に並べ替えてチャット表示に合わせる
          .map((item) => ({
            id: item.id, // DB の id を UI の key として使う
            original: item.original, // 元文を反映する
            converted: item.converted, // 変換後文を反映する
            replySuggestion: item.replySuggestion, // 返信案を反映する
            timestamp: Number.isFinite(Date.parse(item.createdAt)) ? Date.parse(item.createdAt) : Date.now(), // createdAt を timestamp に変換する
            createdAt: item.createdAt, // ISO 文字列も保持しておく
            aggressionScore: item.aggressionScore, // スコアを反映する
          })); // map の変換定義をここで閉じる

        setMessages(mapped); // 取得した履歴を表示用 state に反映する
        setAggressionLevel(mapped.length > 0 ? mapped[mapped.length - 1].aggressionScore : 0); // 最後のスコアをマスコットへ反映する
      } catch (err) {
        if (controller.signal.aborted) return; // 中断時はエラー表示をしない
        console.error(err); // 開発時に原因が追えるようにコンソールへ出す
        setHistoryError('履歴の取得に失敗しました。'); // ユーザー向けのメッセージを state に入れる
      } finally {
        if (controller.signal.aborted) return; // 中断時は state 更新を避ける
        setIsHistoryLoading(false); // ローディング終了を反映する
      }
    };

    loadHistory(); // 初期ロード時に履歴を取得する

    return () => controller.abort(); // アンマウント時に通信を中断して安全にする
  }, [sessionId, hasMessages]); // session_id が確定したタイミングで履歴を取得する

  return { sessionId, messages, aggressionLevel, isHistoryLoading, historyError, onMessageSent }; // 画面に必要な値と操作を返す
};
