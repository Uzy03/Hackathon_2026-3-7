/**
 * クレーマーからのメッセージを表す型
 */
export interface Message {
  /** 一意のID */
  id: string; // UI 上の一意キーとしても使うIDを表す
  /** 顧客ID（DB履歴から取得する場合のみ） */
  customerId?: string; // DB 履歴から復元した場合のみ付与される顧客IDを表す
  /** 元のメッセージ（クレーマー入力） */
  original: string; // クレーマーの原文を表す
  /** 毒抜き後のメッセージ */
  converted: string; // 工務店側に提示する丁寧文面を表す
  /** 工務店側の返信案 */
  replySuggestion?: string; // 生成された返信案（過去データ互換のためオプショナル）
  /** メッセージが送信された時刻のタイムスタンプ */
  timestamp: number; // 表示用の時刻を表す UNIX ミリ秒を保持する
  /** DB上の作成日時（履歴から取得する場合のみ） */
  createdAt?: string; // DB の created_at（ISO 文字列）を保持する
  /** その時点での攻撃性スコア (0.0 - 1.0) */
  aggressionScore: number; // 0.0〜1.0 の攻撃性スコアを保持する
  /** 緊急度 (1 - 5) */
  urgency?: number; // 顧客の感情とは別の緊急度・重要度を表す
  /** 丁寧さ (1 - 5) */
  politeness?: number;
  /** 明確性 (1 - 5) */
  clarity?: number;
  /** 具体性 (1 - 5) */
  specificity?: number;
  /** 感情安定性 (1 - 5) */
  emotionalStability?: number;
  /** 金銭要求度 (1 - 5) */
  financialDemand?: number;
}

/**
 * 顧客（クレーマー）を表す型
 */
export interface Customer {
  /** 一意のID（Supabase customers.id） */
  id: string; // Supabase の customers.id を表す
  /** ブラウザ単位のセッションID（customers.session_id） */
  sessionId: string; // localStorage で保持される session_id を表す
  /** 作成日時（ISO文字列） */
  createdAt: string; // 顧客レコードの作成日時を表す
}

/**
 * 顧客ごとの集計結果を表す型
 */
export interface CustomerStats {
  /** 顧客ID（customers.id） */
  customerId: string; // 顧客を識別する customers.id を表す
  /** 平均攻撃性スコア（0.0 - 1.0） */
  avgAggressionScore: number; // messages の aggression_score の平均値を表す
  /** 最大緊急度 */
  maxUrgency: number; // 最大緊急度を表す
  /** 平均星数 */
  avgStars: number; // 平均星数を表す
  /** 累計メッセージ数 */
  messageCount: number; // messages の件数（累計）を表す
  /** 最終送信日時（ISO文字列、未送信の場合は null） */
  lastMessageAt: string | null; // 最新メッセージの created_at を表す（無い場合は null）
}

/**
 * マスコットの感情状態を表す型
 */
export type MascotEmotion = 'normal' | 'angry' | 'sad' | 'scared';

/**
 * アプリケーション全体のステートを管理するためのContext型
 */
export interface AppState {
  aggressionLevel: number;
  messages: Message[];
}
