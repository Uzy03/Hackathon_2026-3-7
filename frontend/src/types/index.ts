/**
 * クレーマーからのメッセージを表す型
 */
export interface Message {
  /** 一意のID */
  id: string;
  /** 元のメッセージ（クレーマー入力） */
  original: string;
  /** 毒抜き後のメッセージ */
  converted: string;
  /** メッセージが送信された時刻のタイムスタンプ */
  timestamp: number;
  /** その時点での攻撃性スコア (0.0 - 1.0) */
  aggressionScore: number;
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
