export type CustomerListItem = { // /api/customers の 1 要素を表す型を定義する
  customerId: string; // customers.id を表す
  displayName: string; // customers.display_name を表す
  avgAggressionScore: number; // 平均攻撃性スコアを表す
  messageCount: number; // 累計メッセージ数を表す
  lastMessageAt: string | null; // 最終送信日時（ISO文字列）を表す
  createdAt: string; // 顧客作成日時（ISO文字列）を表す
}; // 型定義をここで閉じる

export type CustomerMessageRecord = { // /api/customers/{id}/messages の 1 要素を表す型を定義する
  id: string; // messages.id を表す
  original: string; // 元文を表す
  converted: string; // 変換後文を表す
  replySuggestion?: string; // 返信案を表す（過去データ互換のためオプショナル）
  aggressionScore: number; // 攻撃性スコアを表す
  createdAt: string; // 作成日時（ISO文字列）を表す
}; // 型定義をここで閉じる

export type CustomerRecord = { // /api/customers/{id} の更新後レコードを表す型を定義する
  customerId: string; // customers.id を表す
  displayName: string; // customers.display_name を表す
  createdAt: string; // customers.created_at を表す
}; // 型定義をここで閉じる
