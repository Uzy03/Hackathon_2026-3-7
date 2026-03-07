import { useMemo } from 'react';

/**
 * マスコットの状態を管理するカスタムフック
 * @param aggressionLevel - 現在の攻撃性スコア (0.0 - 1.0)
 * @returns マスコットの視覚的なプロパティ（色、震え強度、涙の有無）
 */
export const useMascotState = (aggressionLevel: number) => {
  // 攻撃性レベルに基づいてマスコットの色を計算する
  // 0.0 (白/クリーム) -> 1.0 (赤)
  const color = useMemo(() => {
    // 赤みの強度を計算 (常に高い)
    const r = 255;
    // 緑と青の強度を計算 (攻撃性が高いほど低くなる = 赤くなる)
    // ベースは少し黄色っぽい白 (255, 255, 240)
    const g = Math.max(0, Math.floor(255 - aggressionLevel * 255));
    const b = Math.max(0, Math.floor(240 - aggressionLevel * 240));
    
    return `rgb(${r}, ${g}, ${b})`;
  }, [aggressionLevel]);

  // 震えの強度を計算
  // 0.3以上から震え始め、1.0で最大
  const shakeIntensity = useMemo(() => {
    if (aggressionLevel < 0.3) return 0;
    return (aggressionLevel - 0.3) * 20; // 最大14px程度の震え
  }, [aggressionLevel]);

  // 涙が出るかどうか
  // 0.7以上で涙が出る
  const isCrying = useMemo(() => {
    return aggressionLevel > 0.7;
  }, [aggressionLevel]);

  return {
    color,
    shakeIntensity,
    isCrying,
  };
};
