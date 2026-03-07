'use client';

import React, { useState } from 'react';
import { ChatForm } from '../features/chat/components/ChatForm';
import { MascotDisplay } from '../features/mascot/components/MascotDisplay';
import { DebugSlider } from '../features/mascot/components/DebugSlider';
import { MessageList } from '../features/dashboard/components/MessageList';
import { Message } from '../types';

/**
 * メインダッシュボード画面
 * 3カラムレイアウトで構成される
 */
export default function Home() {
  // マスコットの攻撃性レベル (0.0 - 1.0)
  const [aggressionLevel, setAggressionLevel] = useState<number>(0);
  // メッセージリスト
  const [messages, setMessages] = useState<Message[]>([]);

  /**
   * メッセージ送信時のハンドラ
   * 新しいメッセージを追加し、攻撃性レベルを更新する
   */
  const handleMessageSent = (newMessage: Message) => {
    // メッセージリストの先頭に追加
    setMessages((prev) => [newMessage, ...prev]);
    
    // 攻撃性レベルを更新 (アニメーションのために少し遅らせるなどの演出も可)
    setAggressionLevel(newMessage.aggressionScore);

    // 一定時間後に攻撃性レベルを下げる (クールダウン)
    // 実際にはもっと複雑なロジックになるが、今回は簡易実装
    // 10秒かけて徐々に下げる
    // ※ デバッグ中は自動減少が邪魔になるかもしれないので、一旦コメントアウトするか、非常にゆっくりにする
    /*
    const interval = setInterval(() => {
      setAggressionLevel((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return Math.max(0, prev - 0.05);
      });
    }, 1000);
    */
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800">
          工務店向け 毒抜きAIダッシュボード
        </h1>
        <p className="text-gray-500 mt-2">
          クレーマーの暴言を、心安らぐメッセージに変換します。
        </p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-auto lg:h-[calc(100vh-200px)]">
        {/* 左カラム: クレーマー入力 */}
        <section className="h-[400px] lg:h-full overflow-hidden">
          <ChatForm onMessageSent={handleMessageSent} />
        </section>

        {/* 中央カラム: マスコット表示 */}
        <section className="h-[300px] lg:h-full flex flex-col items-center justify-center overflow-hidden">
          <MascotDisplay aggressionLevel={aggressionLevel} />
        </section>

        {/* 右カラム: 工務店ダッシュボード */}
        <section className="h-[400px] lg:h-full overflow-hidden">
          <MessageList messages={messages} />
        </section>
      </main>

      {/* デバッグ用スライダー (画面左下に固定) */}
      <DebugSlider 
        value={aggressionLevel} 
        onChange={setAggressionLevel} 
      />
    </div>
  );
}
