import React from 'react'; // 顧客一覧パネルを定義するために React を読み込む
import clsx from 'clsx'; // 選択状態に応じてクラスを切り替えるために clsx を使う
import { CustomerListItem } from '../types'; // 顧客一覧の型を参照する

type CustomerListPanelProps = { // 顧客一覧パネルが受け取る props を型で固定する
  customers: CustomerListItem[]; // 顧客一覧を受け取る
  selectedCustomerId: string | null; // 選択中の顧客IDを受け取る
  isLoading: boolean; // ローディング状態を受け取る
  error: string | null; // エラー文言を受け取る
  onSelect: (customerId: string) => void; // 顧客選択時に呼び出す関数を受け取る
}; // props 型定義をここで閉じる

/**
 * 工務店画面の顧客一覧パネル
 * @param customers - 顧客一覧
 * @param selectedCustomerId - 選択中の顧客ID
 * @param isLoading - ローディング状態
 * @param error - エラー文言
 * @param onSelect - 顧客選択時のハンドラ
 */
export const CustomerListPanel: React.FC<CustomerListPanelProps> = ({ customers, selectedCustomerId, isLoading, error, onSelect }) => {
  return (
    <aside className="bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-lg font-bold text-green-700">顧客一覧</h2>
        <p className="text-xs text-gray-400">ID と暫定名、統計を表示します。</p>
      </div>

      {error && <div className="px-4 py-3 text-sm font-bold text-red-500 bg-red-50">{error}</div>}

      <div className="flex-1 overflow-y-auto">
        {isLoading && customers.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">読み込み中...</div>
        ) : customers.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">顧客がまだいません</div>
        ) : (
          customers.map((c) => (
            <button
              key={c.customerId}
              onClick={() => onSelect(c.customerId)}
              className={clsx(
                'w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors',
                selectedCustomerId === c.customerId && 'bg-green-50',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{c.displayName}</p>
                  <p className="text-[11px] text-gray-400 truncate">{c.customerId}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">件数: {c.messageCount}</p>
                  <p className="text-xs text-gray-500">平均Lv: {Math.round(c.avgAggressionScore * 100)}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
};
