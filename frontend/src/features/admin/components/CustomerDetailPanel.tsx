import React from 'react'; // 顧客詳細パネルを定義するために React を読み込む
import { CustomerListItem, CustomerMessageRecord } from '../types'; // 顧客/履歴の型を参照する
import { CustomerMessageTimeline } from './CustomerMessageTimeline'; // 履歴一覧コンポーネントを読み込む

type CustomerDetailPanelProps = { // 顧客詳細パネルが受け取る props を型で固定する
  customer: CustomerListItem | null; // 選択中の顧客情報を受け取る
  messages: CustomerMessageRecord[]; // 選択中顧客の履歴を受け取る
  isMessagesLoading: boolean; // 履歴ローディング状態を受け取る
  messagesError: string | null; // 履歴エラー文言を受け取る
}; // props 型定義をここで閉じる

/**
 * 工務店画面の顧客詳細パネル
 * @param customer - 選択中顧客
 * @param messages - 選択中顧客の履歴
 * @param isMessagesLoading - 履歴ローディング状態
 * @param messagesError - 履歴エラー文言
 */
export const CustomerDetailPanel: React.FC<CustomerDetailPanelProps> = ({ customer, messages, isMessagesLoading, messagesError }) => {
  if (!customer) {
    return (
      <section className="bg-white border border-gray-100 rounded-xl shadow-lg p-6 flex flex-col">
        <h2 className="text-lg font-bold text-green-700 mb-1">顧客詳細</h2>
        <p className="text-sm text-gray-400">左の顧客一覧から選択してください。</p>
      </section>
    );
  }

  return (
    <section className="bg-white border border-gray-100 rounded-xl shadow-lg p-6 flex flex-col min-h-0">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-green-700">顧客詳細</h2>
        <p className="text-sm font-bold text-gray-800 mt-1">{customer.displayName}</p>
        <p className="text-xs text-gray-400 break-all">{customer.customerId}</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <p className="text-[11px] text-gray-400">累計件数</p>
            <p className="text-sm font-bold text-gray-800">{customer.messageCount}</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <p className="text-[11px] text-gray-400">平均攻撃性</p>
            <p className="text-sm font-bold text-gray-800">Lv.{Math.round(customer.avgAggressionScore * 100)}</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <p className="text-[11px] text-gray-400">最終送信</p>
            <p className="text-sm font-bold text-gray-800">{customer.lastMessageAt ? new Date(customer.lastMessageAt).toLocaleString() : '-'}</p>
          </div>
        </div>
      </div>

      <CustomerMessageTimeline messages={messages} isLoading={isMessagesLoading} error={messagesError} />
    </section>
  );
};
