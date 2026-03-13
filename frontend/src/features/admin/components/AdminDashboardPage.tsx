import React, { useMemo, useState } from 'react'; // 選択状態と派生値を扱うために React Hooks を使う
import Link from 'next/link'; // ルートへ戻る導線を作るために Link を使う
import { CustomerDetailPanel } from './CustomerDetailPanel'; // 顧客詳細パネルを読み込む
import { CustomerListPanel } from './CustomerListPanel'; // 顧客一覧パネルを読み込む
import { useCustomerMessages } from '../hooks/useCustomerMessages'; // 選択顧客の履歴取得フックを読み込む
import { useCustomers } from '../hooks/useCustomers'; // 顧客一覧取得フックを読み込む
import { CustomerListItem } from '../types'; // 顧客一覧の型を参照する

/**
 * 工務店用ダッシュボード画面
 * @returns 顧客一覧と顧客詳細（履歴/統計）を描画する
 */
export const AdminDashboardPage: React.FC = () => {
  const { customers, isLoading, error } = useCustomers(); // 顧客一覧を取得する
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null); // 選択中の顧客IDを state で保持する
  const { messages, isLoading: isMessagesLoading, error: messagesError } = useCustomerMessages(selectedCustomerId); // 選択顧客の履歴を取得する

  const selectedCustomer: CustomerListItem | null = useMemo(() => {
    if (!selectedCustomerId) return null; // 未選択時は null を返す
    return customers.find((c) => c.customerId === selectedCustomerId) || null; // 一致する顧客が無い場合も null にする
  }, [customers, selectedCustomerId]); // 顧客一覧と選択IDが変わったら再計算する

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-green-700">工務店ダッシュボード</h1>
          <p className="text-gray-500 text-sm mt-1">顧客一覧から選択して、会話履歴と統計を確認します。</p>
        </div>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          画面選択へ
        </Link>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
        <div className="lg:col-span-1 min-h-0">
          <CustomerListPanel
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            isLoading={isLoading}
            error={error}
            onSelect={setSelectedCustomerId}
          />
        </div>

        <div className="lg:col-span-2 min-h-0">
          <CustomerDetailPanel customer={selectedCustomer} messages={messages} isMessagesLoading={isMessagesLoading} messagesError={messagesError} />
        </div>
      </main>
    </div>
  );
};
