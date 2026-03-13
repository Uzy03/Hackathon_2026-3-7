'use client'; // クレーマー画面はブラウザ状態（localStorage等）を扱うため client component とする

import React from 'react'; // 画面コンポーネントを定義するために React を読み込む
import { ClientChatPage } from '../../features/client/components/ClientChatPage'; // クレーマー用のチャット画面を読み込む

/**
 * クレーマー用画面
 * @returns クレーマーの送信UI（LINE風チャット）を描画する
 */
export default function ClientPage() {
  return <ClientChatPage />; // 機能を features 配下に集約して SRP を守る
}
