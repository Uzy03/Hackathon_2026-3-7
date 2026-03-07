import React from 'react';
import { useMascotState } from '../hooks/useMascotState';

interface MascotDisplayProps {
  /** 現在の攻撃性レベル (0.0 - 1.0) */
  aggressionLevel: number;
}

/**
 * マスコットを表示するコンポーネント
 * 攻撃性レベルに応じて表情や色が変化する
 * @param aggressionLevel - 現在の攻撃性スコア
 */
export const MascotDisplay: React.FC<MascotDisplayProps> = ({ aggressionLevel }) => {
  // マスコットの状態を取得 (色、震え、涙)
  const { color, shakeIntensity, isCrying } = useMascotState(aggressionLevel);

  // 震えのアニメーションスタイル
  // 乱数を使ってプルプルさせる (簡易的)
  // 注意: Reactのレンダリング毎に再計算されるため、実際のアニメーションにはCSS animationの方が望ましいが、
  // 今回は簡易実装としてインラインスタイルで対応
  const shakeStyle = shakeIntensity > 0 ? {
    transform: `translate(${Math.random() * shakeIntensity - shakeIntensity / 2}px, ${Math.random() * shakeIntensity - shakeIntensity / 2}px)`,
    transition: 'transform 0.05s ease-in-out',
  } : {};

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-4 transition-colors duration-500 ease-in-out bg-white rounded-lg shadow-lg">
      <div 
        className="relative w-full max-w-[250px] aspect-square transition-all duration-300"
        style={shakeStyle}
      >
        {/* SVGでマスコットを描画 */}
        <svg viewBox="0 0 200 200" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* 顔のベース */}
          <circle 
            cx="100" 
            cy="100" 
            r="90" 
            fill={color} 
            stroke="black" 
            strokeWidth="3"
            className="transition-colors duration-500"
          />
          
          {/* 目 (左) */}
          <circle cx="70" cy="80" r="10" fill="black" />
          
          {/* 目 (右) */}
          <circle cx="130" cy="80" r="10" fill="black" />
          
          {/* 涙 (攻撃性が高い場合のみ表示) */}
          {isCrying && (
            <>
              {/* 左目の涙 */}
              <path d="M 65 95 Q 60 110 65 130" stroke="blue" strokeWidth="2" fill="cyan" className="animate-pulse opacity-70" />
              {/* 右目の涙 */}
              <path d="M 135 95 Q 140 110 135 130" stroke="blue" strokeWidth="2" fill="cyan" className="animate-pulse opacity-70" />
            </>
          )}

          {/* 口 (攻撃性が高いとへの字、低いと笑顔) */}
          {aggressionLevel > 0.5 ? (
            // 怒り/悲しみ (への字)
            <path d="M 60 140 Q 100 110 140 140" stroke="black" strokeWidth="3" fill="none" />
          ) : (
            // 笑顔 (U字)
            <path d="M 60 130 Q 100 160 140 130" stroke="black" strokeWidth="3" fill="none" />
          )}

          {/* 汗 (中程度のストレス) */}
          {aggressionLevel > 0.3 && aggressionLevel <= 0.7 && (
            <path d="M 160 60 Q 170 70 160 80" stroke="blue" strokeWidth="2" fill="none" />
          )}

          {/* 血管 (激怒) */}
          {aggressionLevel > 0.8 && (
            <path d="M 40 50 L 60 60 M 50 40 L 50 70" stroke="red" strokeWidth="3" />
          )}
        </svg>
      </div>
      
      {/* ストレス値の表示 */}
      <div className="mt-8 text-xl font-bold text-gray-800">
        ストレス値: {(aggressionLevel * 100).toFixed(0)}%
      </div>
      
      {/* 状態の説明テキスト */}
      <div className="mt-2 text-sm text-gray-500">
        {aggressionLevel > 0.8 ? "激怒しています！" :
         aggressionLevel > 0.5 ? "かなり参っています..." :
         aggressionLevel > 0.3 ? "少し不機嫌です" :
         "平常心です"}
      </div>
    </div>
  );
};
