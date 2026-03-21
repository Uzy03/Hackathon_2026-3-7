import React, { useState } from 'react'; // 顧客詳細パネルを定義するために React と useState を読み込む
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
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

  // メッセージの履歴から重要度などの統計を計算する
  const maxUrgency = messages.length > 0
    ? Math.max(...messages.map(m => m.urgency || 1))
    : 1;

  // カテゴリごとの最大緊急度を抽出する
  const categoryUrgency = messages.reduce((acc, m) => {
    const match = m.converted.match(/^【(.*?)】/);
    const category = match ? match[1] : 'その他';
    const imp = m.urgency || 1;
    if (!acc[category] || acc[category] < imp) {
      acc[category] = imp;
    }
    return acc;
  }, {} as Record<string, number>);

  // 緊急度3以上のカテゴリを高く評価された順に並べる
  const highestCategories = Object.entries(categoryUrgency)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, imp]) => imp >= 3)
    .map(([cat]) => cat);

  // メッセージ履歴から5つの指標の平均値を計算する
  const avgMetrics = React.useMemo(() => {
    if (messages.length === 0) return [];
    let politenessSum = 0;
    let claritySum = 0;
    let specificitySum = 0;
    let emotionalStabilitySum = 0;
    let financialDemandSum = 0;

    messages.forEach(m => {
      politenessSum += m.politeness ?? 3;
      claritySum += m.clarity ?? 3;
      specificitySum += m.specificity ?? 3;
      emotionalStabilitySum += m.emotionalStability ?? 3;
      financialDemandSum += m.financialDemand ?? 1;
    });

    const len = messages.length;
    return [
      { subject: '丁寧さ', score: Math.round(politenessSum / len * 10) / 10 },
      { subject: '明確性', score: Math.round(claritySum / len * 10) / 10 },
      { subject: '具体性', score: Math.round(specificitySum / len * 10) / 10 },
      { subject: '感情安定性', score: Math.round(emotionalStabilitySum / len * 10) / 10 },
      { subject: '金銭要求度', score: Math.round(financialDemandSum / len * 10) / 10 },
    ];
  }, [messages]);

  return (
    <section className="bg-white border border-gray-100 rounded-xl shadow-lg p-6 flex flex-col min-h-0">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-green-700">顧客詳細</h2>
        <p className="text-sm font-bold text-gray-800 mt-1">{customer.displayName}</p>
        <p className="text-xs text-gray-400 break-all">{customer.customerId}</p>
        <div className="mt-3 grid grid-cols-4 gap-3">
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <p className="text-[11px] text-gray-400">累計件数</p>
            <p className="text-sm font-bold text-gray-800">{customer.messageCount}</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <p className="text-[11px] text-gray-400">平均攻撃性</p>
            <p className="text-sm font-bold text-gray-800">Lv.{Math.round(customer.avgAggressionScore * 100)}</p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
            <p className="text-[11px] text-orange-600 font-bold">最大緊急度</p>
            <p className="text-sm font-bold text-gray-800">Lv.{maxUrgency}</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <p className="text-[11px] text-gray-400">最終送信</p>
            <p className="text-sm font-bold text-gray-800">{customer.lastMessageAt ? new Date(customer.lastMessageAt).toLocaleString() : '-'}</p>
          </div>
        </div>
        
        {highestCategories.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-gray-500">緊急対応カテゴリ:</span>
            {highestCategories.slice(0, 3).map(cat => (
              <span key={cat} className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                {cat}
              </span>
            ))}
          </div>
        )}

        {avgMetrics.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2">ポジティブ・コミュニケーション指標</h3>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-gray-700">総合評価:</span>
              <div className="flex gap-1" style={{ WebkitTextStroke: '1px black' }}>
                {[1, 2, 3, 4, 5].map(star => {
                  const avgScore = avgMetrics.reduce((sum, m) => sum + m.score, 0) / 5;
                  const isFilled = star <= Math.round(avgScore);
                  // 未満の場合は白抜きまたは黒線の星を表現するため文字色を透明・白・グレー等にする
                  return (
                    <span key={star} className={`text-xl ${isFilled ? 'text-yellow-400' : 'text-gray-100'} drop-shadow-sm`}>
                      ★
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="w-full h-64 bg-gray-50 rounded-lg flex items-center justify-center p-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={avgMetrics}>
                  <PolarGrid stroke="#e5e7eb" radialLines={false} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} tickCount={6} />
                  <Radar name="顧客スコア" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-3 border-t border-gray-100 pt-4">
        <h3 className="text-sm font-bold text-gray-700">メッセージ履歴</h3>
      </div>

      <CustomerMessageTimeline messages={messages} isLoading={isMessagesLoading} error={messagesError} />
    </section>
  );
};
