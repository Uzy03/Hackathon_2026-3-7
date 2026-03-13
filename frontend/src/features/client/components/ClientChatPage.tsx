import React from 'react'; // 画面コンポーネントを定義するために React を読み込む
import Link from 'next/link'; // ルートへ戻る導線を作るために Link を使う
import { MascotDisplay } from '../../mascot/components/MascotDisplay'; // マスコット表示を再利用する
import { ClientChatComposer } from './ClientChatComposer'; // チャット入力欄を読み込む
import { ClientChatTimeline } from './ClientChatTimeline'; // チャット一覧を読み込む
import { useClientChatState } from '../hooks/useClientChatState'; // クレーマー画面の状態管理フックを読み込む

/**
 * クレーマー用のチャット画面（LINE風）
 * @returns クレーマーの送信UIとマスコットを描画する
 */
export const ClientChatPage: React.FC = () => {
  const { messages, aggressionLevel, isHistoryLoading, historyError, onMessageSent } = useClientChatState(); // 画面に必要な state と操作をまとめて取得する

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex flex-col relative">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-red-600">クレーマー画面</h1>
          <p className="text-xs text-gray-400">送信すると「工務店に届く内容」に毒抜きされます。</p>
        </div>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          画面選択へ
        </Link>
      </header>

      <div className="fixed right-4 top-20 z-50 bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-4">
        <div className="w-44 h-28 flex items-center justify-center">
          <div className="scale-125 origin-center">
            <MascotDisplay aggressionLevel={aggressionLevel} />
          </div>
        </div>
        <div className="min-w-[120px]">
          <p className="text-xs text-gray-400">現在の攻撃性</p>
          <p className="text-base font-bold text-gray-700">Lv.{Math.round(aggressionLevel * 100)}</p>
        </div>
      </div>

      <ClientChatTimeline messages={messages} isHistoryLoading={isHistoryLoading} />
      <ClientChatComposer onMessageSent={onMessageSent} errorMessage={historyError} />
    </div>
  );
};
