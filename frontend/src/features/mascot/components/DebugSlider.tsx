import React from 'react';

interface DebugSliderProps {
  /** 現在の値 (0.0 - 1.0) */
  value: number;
  /** 値が変更されたときのコールバック */
  onChange: (value: number) => void;
}

/**
 * デバッグ用スライダーコンポーネント
 * 攻撃性レベルを手動で変更するために使用する
 * 画面の左下に固定表示される
 */
export const DebugSlider: React.FC<DebugSliderProps> = ({ value, onChange }) => {
  return (
    <div className="fixed bottom-4 left-4 p-4 bg-white/90 rounded-lg shadow-xl border border-gray-300 z-50 w-64">
      <div className="flex justify-between items-center mb-2">
        <label htmlFor="aggression-slider" className="text-sm font-bold text-gray-700">
          Debug: Aggression Level
        </label>
        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
          {value.toFixed(2)}
        </span>
      </div>
      
      <input
        id="aggression-slider"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      
      <div className="flex justify-between mt-1 text-[10px] text-gray-400">
        <span>Normal</span>
        <span>Angry</span>
      </div>
    </div>
  );
};
