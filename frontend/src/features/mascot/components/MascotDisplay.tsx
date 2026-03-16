import React from 'react';
import { useMascotState } from '../hooks/useMascotState';
import { renderExpression } from '../assets/MascotExpressions';

interface MascotDisplayProps {
  /** 現在の攻撃性レベル (0.0 - 1.0) */
  aggressionLevel: number;
  /** AI応答待ち中かどうか */
  isLoading?: boolean;
  /** 装飾付きの枠を表示するか */
  showFrame?: boolean;
  /** ストレス値と状態テキストを表示するか */
  showStatus?: boolean;
}

/**
 * マスコットを表示するコンポーネント
 * 攻撃性レベルに応じて表情や色が変化する
 * @param aggressionLevel - 現在の攻撃性スコア
 * @param isLoading - AI応答待ち中かどうか
 */
export const MascotDisplay: React.FC<MascotDisplayProps> = ({ aggressionLevel, isLoading = false, showFrame = true, showStatus = true }) => {
  // マスコットの状態を取得 (色、震え、表情)
  const { color, shakeIntensity, expression } = useMascotState(aggressionLevel, isLoading);

  // 震えのクラスを決定（微調整：新しいキャラの形状に合わせて）
  const shakeClass =
    shakeIntensity > 8 ? 'animate-shake-hard' :
    shakeIntensity > 0 ? 'animate-shake' :
    '';

  // 背景色の変化タイミングを調整（攻撃性が高いほど早く変化）
  const bgColorTransition = aggressionLevel > 0.5 ? 'duration-300' : 'duration-500';

  return (
    <div className={showFrame ? `flex flex-col items-center justify-center h-full w-full p-4 transition-colors ${bgColorTransition} ease-in-out bg-white rounded-lg shadow-lg` : 'flex items-center justify-center h-full w-full'}>
      <div 
        className={`relative w-full max-w-[250px] aspect-square transition-all duration-300 ${shakeClass}`}
      >
        {/* 新しいSVGコンポーネントでマスコットを描画 */}
        {renderExpression(expression, { color, size: 200 })}
      </div>
      
      {showStatus && (
        <>
          <div className="mt-8 text-xl font-bold text-gray-800">
            ストレス値: {(aggressionLevel * 100).toFixed(0)}%
          </div>
          
          <div className="mt-2 text-sm text-gray-500">
            {isLoading ? "考え中..." :
             aggressionLevel > 0.8 ? "激怒しています！" :
             aggressionLevel > 0.5 ? "かなり参っています..." :
             aggressionLevel > 0.3 ? "少し不機嫌です" :
             "平常心です"}
          </div>
        </>
      )}
    </div>
  );
};
