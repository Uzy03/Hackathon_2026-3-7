import React from 'react'; // 画面コンポーネントを定義するために React を読み込む
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
  const [isSending, setIsSending] = React.useState(false); // メッセージ送信中の状態を管理

  // ローディング状態を統合（履歴取得中またはメッセージ送信中）
  const isLoading = isHistoryLoading || isSending;

  return (
    <div className="h-[100dvh] bg-gray-100 font-sans flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-red-600">まもるくんチャット</h1>
          <p className="text-xs text-gray-400">送信するとまもるくん（AI）が返信します。</p>
        </div>
      </header>

      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-10">
        <section className="lg:col-span-7 min-h-0 flex flex-col overflow-hidden">
          <ClientChatTimeline messages={messages} isHistoryLoading={isHistoryLoading} />
          <ClientChatComposer 
            onMessageSent={onMessageSent} 
            errorMessage={historyError} 
            onLoadingChange={setIsSending}
          />
        </section>

        <aside className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-gray-200 bg-white min-h-0">
          <div className="h-full w-full flex items-center justify-center p-6">
            <div className="w-full max-w-[420px] aspect-square flex items-center justify-center">
              <div className="scale-[2.2] origin-center">
                <MascotDisplay aggressionLevel={aggressionLevel} isLoading={isLoading} showFrame={false} showStatus={false} />
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};
