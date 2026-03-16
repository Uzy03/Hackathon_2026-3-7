import React from 'react';

export type ExpressionType = 'normal' | 'worried' | 'crying' | 'damaged' | 'thinking' | 'scared';

interface MascotExpressionProps {
  /** 顔の色（SVGファイル使用時は未使用だが、互換性のため保持） */
  color: string;
  /** サイズ（viewBoxの基準） */
  size?: number;
}

/**
 * 平常表情のSVGコンポーネント（laughing.svg）
 */
export const NormalExpression: React.FC<MascotExpressionProps> = ({ color, size = 200 }) => {
  const [imgError, setImgError] = React.useState(false);
  
  return (
    <div className="w-full h-full flex items-center justify-center">
      {imgError ? (
        <div className="text-gray-400 text-sm">画像を読み込めません</div>
      ) : (
        <img
          src="/mascot/laughing.svg"
          alt="平常表情"
          className="w-full h-full object-contain"
          style={{ maxWidth: `${size}px`, maxHeight: `${size}px` }}
          onError={() => {
            console.error('Failed to load laughing.svg');
            setImgError(true);
          }}
        />
      )}
    </div>
  );
};

/**
 * 困り表情のSVGコンポーネント（beTrouble.svg）
 */
export const WorriedExpression: React.FC<MascotExpressionProps> = ({ color, size = 200 }) => {
  const [imgError, setImgError] = React.useState(false);
  
  return (
    <div className="w-full h-full flex items-center justify-center">
      {imgError ? (
        <div className="text-gray-400 text-sm">画像を読み込めません</div>
      ) : (
        <img
          src="/mascot/beTrouble.svg"
          alt="困り表情"
          className="w-full h-full object-contain"
          style={{ maxWidth: `${size}px`, maxHeight: `${size}px` }}
          onError={() => {
            console.error('Failed to load beTrouble.svg');
            setImgError(true);
          }}
        />
      )}
    </div>
  );
};

/**
 * 号泣表情のSVGコンポーネント（crying.svg）
 */
export const CryingExpression: React.FC<MascotExpressionProps> = ({ color, size = 200 }) => {
  const [imgError, setImgError] = React.useState(false);
  
  return (
    <div className="w-full h-full flex items-center justify-center">
      {imgError ? (
        <div className="text-gray-400 text-sm">画像を読み込めません</div>
      ) : (
        <img
          src="/mascot/crying.svg"
          alt="号泣表情"
          className="w-full h-full object-contain"
          style={{ maxWidth: `${size}px`, maxHeight: `${size}px` }}
          onError={() => {
            console.error('Failed to load crying.svg');
            setImgError(true);
          }}
        />
      )}
    </div>
  );
};

/**
 * 大ダメージ表情のSVGコンポーネント（reallyCrying.svg）
 */
export const DamagedExpression: React.FC<MascotExpressionProps> = ({ color, size = 200 }) => {
  const [imgError, setImgError] = React.useState(false);
  
  return (
    <div className="w-full h-full flex items-center justify-center">
      {imgError ? (
        <div className="text-gray-400 text-sm">画像を読み込めません</div>
      ) : (
        <img
          src="/mascot/reallyCrying.svg"
          alt="大ダメージ表情"
          className="w-full h-full object-contain"
          style={{ maxWidth: `${size}px`, maxHeight: `${size}px` }}
          onError={() => {
            console.error('Failed to load reallyCrying.svg');
            setImgError(true);
          }}
        />
      )}
    </div>
  );
};

/**
 * 考え中表情のSVGコンポーネント（Thinking.svg）
 */
export const ThinkingExpression: React.FC<MascotExpressionProps> = ({ color, size = 200 }) => {
  const [imgError, setImgError] = React.useState(false);
  
  return (
    <div className="w-full h-full flex items-center justify-center">
      {imgError ? (
        <div className="text-gray-400 text-sm">画像を読み込めません</div>
      ) : (
        <img
          src="/mascot/Thinking.svg"
          alt="考え中表情"
          className="w-full h-full object-contain"
          style={{ maxWidth: `${size}px`, maxHeight: `${size}px` }}
          onError={() => {
            console.error('Failed to load Thinking.svg');
            setImgError(true);
          }}
        />
      )}
    </div>
  );
};

/**
 * おびえ表情のSVGコンポーネント（beScare2.svg）
 */
export const ScaredExpression: React.FC<MascotExpressionProps> = ({ color, size = 200 }) => {
  const [imgError, setImgError] = React.useState(false);
  
  return (
    <div className="w-full h-full flex items-center justify-center">
      {imgError ? (
        <div className="text-gray-400 text-sm">画像を読み込めません</div>
      ) : (
        <img
          src="/mascot/beScare2.svg"
          alt="おびえ表情"
          className="w-full h-full object-contain"
          style={{ maxWidth: `${size}px`, maxHeight: `${size}px` }}
          onError={() => {
            console.error('Failed to load beScare2.svg');
            setImgError(true);
          }}
        />
      )}
    </div>
  );
};

/**
 * 表情タイプに応じた適切な要素を返す
 * @param expression - 表情タイプ
 * @param props - 表情コンポーネントに渡すprops
 */
export const renderExpression = (expression: ExpressionType, props: MascotExpressionProps) => {
  switch (expression) {
    case 'normal':
      return <NormalExpression {...props} />;
    case 'worried':
      return <WorriedExpression {...props} />;
    case 'crying':
      return <CryingExpression {...props} />;
    case 'damaged':
      return <DamagedExpression {...props} />;
    case 'thinking':
      return <ThinkingExpression {...props} />;
    case 'scared':
      return <ScaredExpression {...props} />;
    default:
      return <NormalExpression {...props} />;
  }
};
