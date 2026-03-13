"""FastAPI サーバーのエントリポイント（起動・CORS・ルーティング）を定義する。"""

from __future__ import annotations  # 型ヒントの前方参照を容易にする

from fastapi import FastAPI, HTTPException  # FastAPI 本体と例外（HTTP エラー返却）を読み込む
from fastapi.middleware.cors import CORSMiddleware  # フロントエンド連携のため CORS を設定する

from typing import Optional  # GeminiEngine の遅延初期化のために Optional を使用する

from src.gemini_engine import GeminiEngine  # Gemini 呼び出しロジックを単一責任で担うクラス
from src.schema import ConvertRequest, ConvertResponse  # API の入出力スキーマを読み込む


app: FastAPI = FastAPI()  # FastAPI アプリケーションを生成する（ASGI エントリ）


app.add_middleware(  # CORS 設定をミドルウェアとして追加する
    CORSMiddleware,  # CORS ミドルウェア本体を指定する
    allow_origins=[  # 開発環境のフロントエンド origin を許可する
        "http://localhost:3000",  # Next.js dev server の標準ポートを許可する
        "http://localhost:3002",  # ポート競合時にズレた dev server も許可する
    ],  # 許可 origin の配列をここで閉じる
    allow_credentials=True,  # Cookie 等の資格情報を許可する（将来の拡張に備える）
    allow_methods=["*"],  # すべての HTTP メソッドを許可する（開発用）
    allow_headers=["*"],  # すべてのヘッダーを許可する（Content-Type 等）
)  # ミドルウェア追加をここで閉じる


engine: Optional[GeminiEngine] = None  # API キー未設定でも起動できるように遅延初期化する


def get_engine() -> GeminiEngine:  # 依存（GeminiEngine）を遅延生成して返す
    """GeminiEngine を遅延初期化して返す。

    Returns:
        GeminiEngine: 初期化済みの GeminiEngine インスタンス。
    """

    global engine  # モジュールスコープのキャッシュを更新するために宣言する
    if engine is None:  # 未生成の場合のみ初期化する
        try:  # 初期化時は環境変数不足などで失敗しうるため例外を捕捉する
            engine = GeminiEngine()  # 初回のみ GeminiEngine を生成する
        except Exception as exc:  # 失敗した場合は HTTP 500 として扱えるように例外化する
            detail: str = str(exc)  # 例外の内容を文字列化して判定に使う
            if "GEMINI_API_KEY" in detail:  # API キー未設定は設定不足なので 503 で返す
                raise HTTPException(status_code=503, detail=detail)  # 設定不足を明示して返す
            raise HTTPException(status_code=500, detail=f"GeminiEngine 初期化に失敗しました: {exc}")  # それ以外は内部エラーとして返す
    return engine  # 生成済み（または生成直後）のインスタンスを返す


@app.post("/api/convert", response_model=ConvertResponse)  # 変換 API を POST で公開する
def convert_message(request: ConvertRequest) -> ConvertResponse:  # 入力メッセージを毒抜きし、攻撃性スコアを返す
    """毒抜きと攻撃性スコア算出を同時に行う API。

    Args:
        request: ConvertRequest（message を含むリクエスト）。

    Returns:
        ConvertResponse: original/converted/aggressionScore を含むレスポンス。
    """

    message: str = request.message.strip()  # 前後の空白を除去して入力を正規化する
    if not message:  # 空文字の場合は Gemini 呼び出しを行わない
        raise HTTPException(status_code=400, detail="message は必須です。")  # 400 を返してフロント側に明示する

    try:  # Gemini 呼び出しは外部要因で失敗しうるため例外を捕捉する
        gemini_output = get_engine().convert(message)  # Gemini に変換を依頼し、結果を受け取る
    except Exception as exc:  # 例外をまとめて受け、HTTP 500 に変換する
        raise HTTPException(status_code=500, detail=f"Gemini 変換に失敗しました: {exc}")  # 失敗理由を返してデバッグ容易性を確保する

    return ConvertResponse(  # API のレスポンススキーマに合わせて整形して返す
        original=message,  # 元の入力をそのまま返す（フロント側で表示に使用）
        converted=gemini_output.converted,  # Gemini の毒抜き結果を返す
        aggressionScore=gemini_output.aggressionScore,  # Gemini の攻撃性スコアを返す
    )  # レスポンス生成をここで閉じる
