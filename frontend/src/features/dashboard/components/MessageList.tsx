import React from 'react';
import { Message } from '../../../types';
import { User, Bot } from 'lucide-react';

interface MessageListProps {
  /** 表示するメッセージのリスト */
  messages: Message[];
}

/**
 * 毒抜きされたメッセージを表示するリストコンポーネント
 * 工務店側が見る画面
 * @param messages - メッセージ配列
 */
export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <div className="flex flex-col h-full bg-white p-6 rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <h2 className="text-xl font-bold mb-4 text-green-700 flex items-center gap-2">
        <span>👷</span> 工務店ダッシュボード
      </h2>
      
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            メッセージはまだありません
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="bg-gray-50 rounded-lg p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* 元のメッセージ（デバッグ用・あるいは折りたたみ表示用） */}
              <div className="flex items-start gap-2 mb-2 text-xs text-gray-400 border-b border-gray-200 pb-2">
                <User className="w-3 h-3 mt-0.5" />
                <p className="line-clamp-1 italic">{`"${msg.original}"`}</p>
                <span className="ml-auto text-[10px] bg-red-100 text-red-600 px-1 rounded">
                  Lv.{(msg.aggressionScore * 100).toFixed(0)}
                </span>
              </div>
              
              {/* 毒抜き後のメッセージ */}
              <div className="flex items-start gap-3">
                <div className="bg-green-100 p-2 rounded-full text-green-600 flex-shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 font-medium leading-relaxed">
                    {msg.converted}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
