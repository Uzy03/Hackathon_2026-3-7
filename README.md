# 毒抜きAIダッシュボード (工務店向け)

工務店向けのカスタマーハラスメント対策AIツール。
クレーマーの暴言をAIが「毒抜き」し、工務店がわの返信（MVPは定型文）を生成します。
マスコットキャラクターが攻撃性に応じてリアクションすることで、視覚的にも状況を把握できます。

## 🛠️ 必要要件

- **Node.js**: v18以上推奨
- **npm**: v9以上推奨

## 🚀 セットアップ手順

プロジェクトをクローンした後、以下の手順で環境を構築してください。

### 1. 依存関係の一括インストール

ルートディレクトリで `npm install` を実行すると、フロントエンド（Next.js）と開発補助ツールの依存関係がインストールされます。

```bash
npm install
```

### 2. Backend (Python) のセットアップ

バックエンドは Python (FastAPI) です。以下を実行してください。

```bash
python -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
```

`backend/.env` に以下を設定してください。

- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 💻 起動手順

### ✅ 開発モードでの一括起動

以下のコマンドを実行すると、工務店画面（`http://localhost:3000`）・クレーマー画面（`http://localhost:3001`）・バックエンド（`http://localhost:8000`）が同時に起動します。

```bash
npm run dev
```

## 📂 ディレクトリ構成

```
.
├── backend/          # Python FastAPI サーバー (Gemini 1.5 Flash)
├── frontend/         # Next.js アプリケーション
│   ├── src/features  # 機能ごとに分割されたコンポーネント
│   │   ├── client/   # クレーマー用チャットUI
│   │   ├── admin/    # 工務店用ダッシュボード
│   │   ├── mascot/   # マスコット表示・アニメーション
│   │   └── session/  # session_id の生成・保持
└── infrastructure/   # インフラ構成ファイル (Terraform等)
```

## ✨ 主な機能

1.  **クレーマー画面（3001）**: LINE風チャットで送信し、工務店（AI）の返信を表示。
2.  **工務店画面（3000）**: 顧客一覧から選択して「毒抜き済みのクライアント文 + 工務店（AI）返信」の履歴を確認。
2.  **マスコットリアクション**: 攻撃性スコア（0.0〜1.0）に応じて、マスコットが赤くなったり震えたりします。
3.  **セッションによる顧客識別**: ブラウザ単位の `session_id` で顧客を作成・紐付けし、履歴を保存します。
