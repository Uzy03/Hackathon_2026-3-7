"""FastAPI サーバーのエントリポイント（起動・CORS・ルーティング）を定義する。"""  # 本ファイルの責務を宣言する

from __future__ import annotations  # 型ヒントの前方参照を容易にする

from fastapi import FastAPI, HTTPException, Path, Query  # FastAPI 本体と例外（HTTP エラー返却）と Path/Query を読み込む
from fastapi.middleware.cors import CORSMiddleware  # フロントエンド連携のため CORS を設定する

from typing import Optional  # 遅延初期化のために Optional を使用する

from src.database import SupabaseDatabase  # Supabase 永続化ロジックを単一責任で担うクラス
from src.gemini_engine import GeminiEngine  # Gemini 呼び出しロジックを単一責任で担うクラス
from src.schema import (  # API の入出力スキーマを読み込む
    ConvertRequest,  # convert 入力を表す
    ConvertResponse,  # convert 出力を表す
    CustomerListItem,  # 顧客一覧の返却を表す
    CustomerRecord,  # 顧客レコードの返却を表す
    CustomerStats,  # 顧客統計の返却を表す
    MessageRecord,  # メッセージ履歴の返却を表す
    UpdateCustomerRequest,  # 顧客更新の入力を表す
)  # import をここで閉じる


app: FastAPI = FastAPI()  # FastAPI アプリケーションを生成する（ASGI エントリ）


app.add_middleware(  # CORS 設定をミドルウェアとして追加する
    CORSMiddleware,  # CORS ミドルウェア本体を指定する
    allow_origins=[  # 開発環境のフロントエンド origin を許可する
        "http://localhost:3000",  # Next.js dev server の標準ポートを許可する
        "http://localhost:3001",  # クレーマー用の dev server ポートを許可する
        "http://localhost:3002",  # 既存設定との互換のために残す
    ],  # 許可 origin の配列をここで閉じる
    allow_credentials=True,  # Cookie 等の資格情報を許可する（将来の拡張に備える）
    allow_methods=["*"],  # すべての HTTP メソッドを許可する（開発用）
    allow_headers=["*"],  # すべてのヘッダーを許可する（Content-Type 等）
)  # ミドルウェア追加をここで閉じる


engine: Optional[GeminiEngine] = None  # API キー未設定でも起動できるように遅延初期化する
database: Optional[SupabaseDatabase] = None  # Supabase 設定未完でも起動できるように遅延初期化する


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


def get_database() -> SupabaseDatabase:  # 依存（SupabaseDatabase）を遅延生成して返す
    """SupabaseDatabase を遅延初期化して返す。

    Returns:
        SupabaseDatabase: 初期化済みの SupabaseDatabase インスタンス。
    """

    global database  # モジュールスコープのキャッシュを更新するために宣言する
    if database is None:  # 未生成の場合のみ初期化する
        try:  # 初期化時は環境変数不足などで失敗しうるため例外を捕捉する
            database = SupabaseDatabase()  # 初回のみ SupabaseDatabase を生成する
        except Exception as exc:  # 設定不足は 503、それ以外は 500 として扱う
            detail: str = str(exc)  # 例外の内容を文字列化して判定に使う
            if "SUPABASE_" in detail or "PROJECT_URL" in detail or "PUBLISHED_KEY" in detail:  # 設定不足が疑われる場合
                raise HTTPException(status_code=503, detail=detail)  # 設定不足を明示して返す
            raise HTTPException(status_code=500, detail=f"SupabaseDatabase 初期化に失敗しました: {exc}")  # それ以外は内部エラーとして返す
    return database  # 生成済み（または生成直後）のインスタンスを返す


@app.post("/api/convert", response_model=ConvertResponse)  # 変換 API を POST で公開する
def convert_message(request: ConvertRequest) -> ConvertResponse:  # 入力メッセージを毒抜きし、攻撃性スコアを返す
    """毒抜きと攻撃性スコア算出を同時に行う API。

    Args:
        request: ConvertRequest（message を含むリクエスト）。

    Returns:
        ConvertResponse: original/converted/aggressionScore を含むレスポンス。
    """

    session_id: str = request.session_id.strip()  # session_id の前後空白を除去して顧客識別の揺れを防ぐ
    message: str = request.message.strip()  # 前後の空白を除去して入力を正規化する
    if not message:  # 空文字の場合は Gemini 呼び出しを行わない
        raise HTTPException(status_code=400, detail="message は必須です。")  # 400 を返してフロント側に明示する
    if not session_id:  # 空文字の場合は顧客識別ができないため弾く
        raise HTTPException(status_code=400, detail="session_id は必須です。")  # 400 を返してフロント側に明示する

    try:  # 顧客識別は DB 依存のため例外を捕捉する
        customer_id: str = get_database().get_or_create_customer_id(session_id)  # session_id から顧客IDを確定する
    except HTTPException as exc:  # 既に HTTP として整形済みの例外はそのまま返す
        raise exc  # 503 等の意図したステータスを保持する
    except Exception as exc:  # DB 側の失敗を 500 として返す
        raise HTTPException(status_code=500, detail=f"顧客識別に失敗しました: {exc}")  # 失敗理由を返してデバッグ容易性を確保する

    try:  # Gemini 呼び出しは外部要因で失敗しうるため例外を捕捉する
        gemini_output = get_engine().convert(message)  # Gemini に変換を依頼し、結果を受け取る
    except HTTPException as exc:  # 既に HTTP として整形済みの例外はそのまま返す
        raise exc  # 503 等の意図したステータスを保持する
    except Exception as exc:  # Gemini 側の失敗を 500 として返す
        raise HTTPException(status_code=500, detail=f"Gemini 変換に失敗しました: {exc}")  # 失敗理由を返してデバッグ容易性を確保する

    import json
    combined_payload = json.dumps({
        "converted": gemini_output.converted,
        "replySuggestion": gemini_output.replySuggestion
    }, ensure_ascii=False)

    try:  # 保存は DB 依存のため例外を捕捉する
        get_database().insert_message(  # 変換結果を messages として保存する
            customer_id=customer_id,  # 顧客IDを紐づけて保存する
            original=message,  # トータルの保存: クレーマーの生の文章を保存する
            converted=combined_payload,  # JSON化して一つのカラムに押し込む
            aggression_score=gemini_output.aggressionScore,  # スコアを保存する
        )  # insert_message 呼び出しをここで閉じる
    except HTTPException as exc:  # 既に HTTP として整形済みの例外はそのまま返す
        raise exc  # 503 等の意図したステータスを保持する
    except Exception as exc:  # DB 保存失敗を 500 として返す
        raise HTTPException(status_code=500, detail=f"メッセージ保存に失敗しました: {exc}")  # 失敗理由を返してデバッグ容易性を確保する

    return ConvertResponse(  # API のレスポンススキーマに合わせて整形して返す
        original=message,  # 元の入力をそのまま返す（フロント側で表示に使用）
        converted=gemini_output.converted,  # 毒抜きされたテキストを返す
        aggressionScore=gemini_output.aggressionScore,  # Gemini の攻撃性スコアを返す
        replySuggestion=gemini_output.replySuggestion,  # 返信案を返す
    )  # レスポンス生成をここで閉じる


@app.get("/api/messages", response_model=list[MessageRecord])  # 履歴取得 API を GET で公開する
def list_messages(session_id: str = Query(..., min_length=1)) -> list[MessageRecord]:  # session_id に紐づく履歴を返す
    """セッションに紐づく顧客の過去メッセージ（毒抜き済み）を返す。

    Args:
        session_id: ブラウザ単位で生成・保持される一意のセッションID。

    Returns:
        list[MessageRecord]: 履歴メッセージの配列（新しい順）。
    """

    normalized: str = session_id.strip()  # 前後の空白を除去して検索の揺れを防ぐ
    if not normalized:  # 空文字は識別に使えないため弾く
        raise HTTPException(status_code=400, detail="session_id は必須です。")  # 400 を返してフロント側に明示する

    customer_id: str = get_database().get_or_create_customer_id(normalized)  # 顧客が無い場合は作成しつつIDを確定する
    rows = get_database().list_messages_by_customer_id(customer_id=customer_id, limit=200)  # 直近 200 件を取得する

    import json
    result: list[MessageRecord] = []  # 返却用の配列を作る
    for row in rows:  # Supabase の行を MessageRecord へ変換する
        raw_converted = str(row.get("converted_text") or "")
        converted_text = raw_converted
        reply_suggestion = ""
        if raw_converted.startswith("{") and raw_converted.endswith("}"):
            try:
                parsed = json.loads(raw_converted)
                converted_text = parsed.get("converted", raw_converted)
                reply_suggestion = parsed.get("replySuggestion", "")
            except json.JSONDecodeError:
                pass

        result.append(  # 1件ずつ追加する
            MessageRecord(  # スキーマに合わせて整形する
                id=str(row.get("id")),  # id を文字列化して渡す
                original=str(row.get("original_text") or ""),  # 生メッセージ
                converted=converted_text,  # 抽出した毒抜き文
                aggressionScore=float(row.get("aggression_score") or 0.0),  # スコアを float 化して渡す
                createdAt=str(row.get("created_at") or ""),  # created_at を ISO 文字列として渡す
                replySuggestion=reply_suggestion, # 抽出した返信案
            )  # MessageRecord の生成をここで閉じる
        )  # append をここで閉じる

    return result  # 整形済みの履歴を返す


@app.get("/api/stats/customers", response_model=list[CustomerStats])  # 顧客別統計 API を GET で公開する
def list_customer_stats() -> list[CustomerStats]:  # 顧客別の統計を返す
    """顧客ごとの統計（平均攻撃性スコア/累計件数/最終送信日時）を返す。

    Returns:
        list[CustomerStats]: 顧客別統計の配列。
    """

    stats = get_database().list_customer_stats(limit=2000)  # 直近の messages を対象に集計する（MVP）
    return [CustomerStats.model_validate(item) for item in stats]  # Pydantic で検証して返す


@app.get("/api/customers", response_model=list[CustomerListItem])  # 顧客一覧 API を GET で公開する
def list_customers() -> list[CustomerListItem]:  # 工務店用の顧客一覧を返す
    """工務店画面向けに、顧客一覧（表示名 + 統計）を返す。

    Returns:
        list[CustomerListItem]: 顧客一覧の配列。
    """

    rows = get_database().list_customers_with_stats(customer_limit=200, stats_limit=5000)  # DB から顧客一覧と統計を合成して取得する
    return [CustomerListItem.model_validate(item) for item in rows]  # Pydantic で検証して返す


@app.get("/api/customers/{customer_id}/messages", response_model=list[MessageRecord])  # 顧客別履歴 API を GET で公開する
def list_customer_messages(customer_id: str = Path(..., min_length=1)) -> list[MessageRecord]:  # customer_id に紐づく履歴を返す
    """customer_id に紐づく過去メッセージ（毒抜き済み）を返す。

    Args:
        customer_id: customers.id（UUID 文字列）。

    Returns:
        list[MessageRecord]: 履歴メッセージの配列（新しい順）。
    """

    normalized: str = customer_id.strip()  # 前後の空白を除去して検索の揺れを防ぐ
    if not normalized:  # 空文字は識別に使えないため弾く
        raise HTTPException(status_code=400, detail="customer_id は必須です。")  # 400 を返して呼び出し側に明示する

    rows = get_database().list_messages_by_customer_id(customer_id=normalized, limit=300)  # 直近 300 件を取得する
    import json
    result: list[MessageRecord] = []  # 返却用の配列を作る
    for row in rows:  # Supabase の行を MessageRecord へ変換する
        raw_converted = str(row.get("converted_text") or "")
        converted_text = raw_converted
        reply_suggestion = ""
        if raw_converted.startswith("{") and raw_converted.endswith("}"):
            try:
                parsed = json.loads(raw_converted)
                converted_text = parsed.get("converted", raw_converted)
                reply_suggestion = parsed.get("replySuggestion", "")
            except json.JSONDecodeError:
                pass

        result.append(  # 1件ずつ追加する
            MessageRecord(  # スキーマに合わせて整形する
                id=str(row.get("id")),  # id を文字列化して渡す
                original=str(row.get("original_text") or ""),  # 元文
                converted=converted_text,  # 抽出した毒抜き文
                aggressionScore=float(row.get("aggression_score") or 0.0),  # スコアを float 化して渡す
                createdAt=str(row.get("created_at") or ""),  # created_at を ISO 文字列として渡す
                replySuggestion=reply_suggestion, # 抽出した返信案
            )  # MessageRecord の生成をここで閉じる
        )  # append をここで閉じる
    return result  # 整形済みの履歴を返す


@app.patch("/api/customers/{customer_id}", response_model=CustomerRecord)  # 顧客更新 API を PATCH で公開する
def update_customer(customer_id: str, request: UpdateCustomerRequest) -> CustomerRecord:  # 顧客表示名を更新して返す
    """顧客の表示名を更新して返す。

    Args:
        customer_id: customers.id（UUID 文字列）。
        request: 更新後の displayName を含むリクエスト。

    Returns:
        CustomerRecord: 更新後の顧客レコード。
    """

    normalized: str = customer_id.strip()  # ID の前後空白を除去して検索の揺れを防ぐ
    if not normalized:  # 空文字は識別に使えないため弾く
        raise HTTPException(status_code=400, detail="customer_id は必須です。")  # 400 を返して呼び出し側に明示する

    updated = get_database().update_customer_display_name(customer_id=normalized, display_name=request.displayName)  # DB 上の display_name を更新する
    return CustomerRecord(  # API 返却のスキーマに合わせて整形する
        customerId=str(updated.get("id")),  # 顧客IDを入れる
        displayName=str(updated.get("display_name") or ""),  # 表示名を入れる
        createdAt=str(updated.get("created_at") or ""),  # 作成日時を入れる
    )  # レスポンス生成をここで閉じる
