'use client'; // 工務店画面はブラウザでの選択状態を扱うため client component とする

import React from 'react'; // 画面コンポーネントを定義するために React を読み込む
import { AdminDashboardPage } from '../../features/admin/components/AdminDashboardPage'; // 工務店ダッシュボード画面を読み込む

/**
 * 工務店用画面
 * @returns 顧客一覧と顧客詳細（履歴/統計）を描画する
 */
export default function AdminPage() {
  return <AdminDashboardPage />; // 機能を features 配下に集約して SRP を守る
}
