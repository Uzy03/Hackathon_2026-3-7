import { useMemo } from 'react';
import { ExpressionType } from '../assets/MascotExpressions';

/**
 * マスコットの状態を管理するカスタムフック
 * @param aggressionLevel - 現在の攻撃性スコア (0.0 - 1.0)
 * @param isLoading - AI応答待ち中かどうか
 * @returns マスコットの視覚的なプロパティ（色、震え強度、表情タイプ）
 */
export const useMascotState = (aggressionLevel: number, isLoading: boolean = false) => {
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

  // 震えの強度を計算（微調整：新しいキャラの形状に合わせて強度を調整）
  // 0.25以上から震え始め、1.0で最大
  const shakeIntensity = useMemo(() => {
    if (aggressionLevel < 0.25) return 0;
    // 最大12px程度の震え（以前より少し控えめに）
    return Math.min((aggressionLevel - 0.25) * 16, 12);
  }, [aggressionLevel]);

  // 表情タイプを決定
  const expression: ExpressionType = useMemo(() => {
    // ローディング中は「考え中」または「おびえ」をランダムに表示
    if (isLoading) {
      // 攻撃性が高い場合は「おびえ」、低い場合は「考え中」
      return aggressionLevel > 0.5 ? 'scared' : 'thinking';
    }
    
    // 攻撃性レベルに応じて表情を決定
    if (aggressionLevel >= 0.9) {
      return 'damaged'; // 大ダメージ
    } else if (aggressionLevel >= 0.7) {
      return 'crying'; // 号泣
    } else if (aggressionLevel >= 0.4) {
      return 'worried'; // 困り
    } else {
      return 'normal'; // 平常
    }
  }, [aggressionLevel, isLoading]);

  return {
    color,
    shakeIntensity,
    expression,
  };
};
