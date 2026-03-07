import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// CORSの設定: フロントエンドからのリクエストを許可
app.use(cors());
// JSONボディのパースを有効化
app.use(express.json());

/**
 * 毒抜きAPIのエンドポイント
 * メッセージを受け取り、攻撃性スコアと変換後のメッセージを返す
 */
app.post('/api/convert', (req: Request, res: Response) => {
  // リクエストボディからメッセージを取得
  const { message } = req.body;

  // メッセージがない場合はエラーを返す
  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  // モックの遅延をシミュレート (500ms - 1500ms)
  const delay = Math.floor(Math.random() * 1000) + 500;

  setTimeout(() => {
    // 攻撃性スコアをランダムに生成 (0.0 - 1.0)
    const aggressionScore = Math.random();

    // 簡易的な毒抜きロジック (モック)
    // 本番ではここにLLM呼び出しが入る
    let convertedMessage = "貴重なご意見ありがとうございます。今後の改善に役立てさせていただきます。";
    
    // スコアに応じてメッセージを変化させる (デバッグ用)
    if (aggressionScore > 0.8) {
      convertedMessage = "大変申し訳ございません。至急確認いたします。";
    } else if (aggressionScore > 0.5) {
      convertedMessage = "ご不便をおかけして申し訳ありません。状況を確認いたします。";
    }

    // レスポンスを返す
    res.json({
      original: message,
      converted: convertedMessage,
      aggressionScore,
    });
  }, delay);
});

/**
 * サーバーを起動する
 */
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
