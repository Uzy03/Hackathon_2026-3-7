import React, { useState, useMemo } from 'react'; // 顧客一覧パネルを定義するために React と Hooks を読み込む
import clsx from 'clsx'; // 選択状態に応じてクラスを切り替えるために clsx を使う
import { CustomerListItem } from '../types'; // 顧客一覧の型を参照する

type CustomerListPanelProps = { // 顧客一覧パネルが受け取る props を型で固定する
  customers: CustomerListItem[]; // 顧客一覧を受け取る
  selectedCustomerId: string | null; // 選択中の顧客IDを受け取る
  isLoading: boolean; // ローディング状態を受け取る
  error: string | null; // エラー文言を受け取る
  onSelect: (customerId: string) => void; // 顧客選択時に呼び出す関数を受け取る
}; // props 型定義をここで閉じる

type SortOption = 'dateDesc' | 'angerDesc' | 'urgencyDesc' | 'starsDesc';

/**
 * 工務店画面の顧客一覧パネル
 * @param customers - 顧客一覧
 * @param selectedCustomerId - 選択中の顧客ID
 * @param isLoading - ローディング状態
 * @param error - エラー文言
 * @param onSelect - 顧客選択時のハンドラ
 */
export const CustomerListPanel: React.FC<CustomerListPanelProps> = ({ customers, selectedCustomerId, isLoading, error, onSelect }) => {
  const [sortOption, setSortOption] = useState<SortOption>('dateDesc');

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      switch (sortOption) {
        case 'angerDesc':
          return b.avgAggressionScore - a.avgAggressionScore;
        case 'urgencyDesc':
          return b.maxUrgency - a.maxUrgency;
        case 'starsDesc':
          return b.avgStars - a.avgStars;
        case 'dateDesc':
        default:
          const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
          const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
          return dateB - dateA;
      }
    });
  }, [customers, sortOption]);
  return (
    <aside className="bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100 flex flex-col gap-2">
        <div>
          <h2 className="text-lg font-bold text-green-700">顧客一覧</h2>
          <p className="text-xs text-gray-400">ID と暫定名、統計を表示します。</p>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] font-bold text-gray-500">並び順:</span>
          <select 
            className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-500"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
          >
            <option value="dateDesc">新着順 (最終送信日時)</option>
            <option value="angerDesc">怒りレベル順 (降順)</option>
            <option value="urgencyDesc">最大緊急度順 (降順)</option>
            <option value="starsDesc">星の数順 (降順)</option>
          </select>
        </div>
      </div>

      {error && <div className="px-4 py-3 text-sm font-bold text-red-500 bg-red-50">{error}</div>}

      <div className="flex-1 overflow-y-auto">
        {isLoading && customers.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">読み込み中...</div>
        ) : sortedCustomers.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">顧客がまだいません</div>
        ) : (
          sortedCustomers.map((c) => (
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
                <div className="text-right whitespace-nowrap">
                  <p className="text-xs text-gray-500">件数: {c.messageCount}</p>
                  <div className="flex flex-col items-end mt-1 gap-1">
                    <div className="flex items-center gap-1">
                      <p className="text-[10px] text-gray-500">怒り Lv.{Math.round(c.avgAggressionScore * 100)}</p>
                      <p className="text-[10px] text-orange-600 font-bold ml-1">緊急 Lv.{c.maxUrgency}</p>
                    </div>
                    <div className="flex gap-[1px]">
                      {[1, 2, 3, 4, 5].map(star => {
                        const isFilled = star <= Math.round(c.avgStars || 0);
                        return (
                          <span key={star} className={`text-[10px] ${isFilled ? 'text-yellow-400' : 'text-gray-200'}`}>
                            ★
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
};
