"""FastAPI 入出力のスキーマ定義を集約するモジュール。"""

from pydantic import BaseModel, Field  # Pydantic の基底クラスとフィールド定義を読み込む


class ConvertRequest(BaseModel):  # /api/convert の入力スキーマを表す
    """/api/convert のリクエストボディ（入力）を表すモデル。"""

    session_id: str = Field(  # 顧客識別のためのセッションIDを保持する
        ...,  # 必須項目であることを示す
        description="ブラウザ単位のセッションID（顧客識別用）",  # API ドキュメント用の説明を付与する
        min_length=1,  # 空文字を弾いて顧客識別の破綻を防ぐ
    )  # フィールド定義をここで閉じる
    message: str = Field(  # クレーマーの入力テキストを保持する
        ...,  # 必須項目であることを示す
        description="クレーマー入力（生テキスト）",  # API ドキュメント用の説明を付与する
        min_length=1,  # 空文字を弾くことで無駄な LLM 呼び出しを防ぐ
    )  # フィールド定義をここで閉じる


class GeminiOutput(BaseModel):  # Gemini からの JSON 出力を厳密に受けるためのスキーマ
    """Gemini が返す JSON（converted/aggressionScore）を表すモデル。"""

    aggressionScore: float = Field(  # 攻撃性スコアを表す
        ...,  # 必須項目であることを示す
        description="攻撃性スコア（0.0=冷静〜1.0=激昂）",  # ドキュメント用途の説明
    )  # フィールド定義をここで閉じる
    converted: str = Field(  # 毒抜き変換後の文面を表す
        ...,  # 必須項目であることを示す
        description="毒抜き変換後の丁寧なビジネス敬語メッセージ",  # ドキュメント用途の説明
        min_length=1,  # 空出力を弾いて UI 破綻を防ぐ
    )  # フィールド定義をここで閉じる
    replySuggestion: str = Field(  # 工務店側の返信案を表す
        ...,  # 必須項目であることを示す
        description="工務店側の返信案",  # ドキュメント用途の説明
        min_length=1,  # 空文字を弾く
    )  # フィールド定義をここで閉じる


class ConvertResponse(BaseModel):  # /api/convert の出力スキーマを表す
    """/api/convert のレスポンスボディ（出力）を表すモデル。"""

    original: str = Field(  # 元の入力文（クレーマー入力）を返す
        ...,  # 必須項目であることを示す
        description="元のメッセージ（クレーマー入力）",  # ドキュメント用途の説明
    )  # フィールド定義をここで閉じる
    converted: str = Field(  # 毒抜き後の文面を返す
        ...,  # 必須項目であることを示す
        description="毒抜き後の丁寧なビジネス敬語メッセージ",  # ドキュメント用途の説明
    )  # フィールド定義をここで閉じる
    aggressionScore: float = Field(  # 攻撃性スコアを返す
        ...,  # 必須項目であることを示す
        description="攻撃性スコア（0.0=冷静〜1.0=激昂）",  # ドキュメント用途の説明
        ge=0.0,  # 範囲外の値を弾いて UI/ロジックの整合性を守る
        le=1.0,  # 範囲外の値を弾いて UI/ロジックの整合性を守る
    )  # フィールド定義をここで閉じる
    replySuggestion: str = Field(  # 工務店側の返信案を返す
        ...,  # 必須項目であることを示す
        description="工務店側の返信案",  # ドキュメント用途の説明
    )  # フィールド定義をここで閉じる


class MessageRecord(BaseModel):  # messages テーブルから返す 1 件のメッセージを表す
    """messages テーブルの 1 レコード（履歴表示用）を表すモデル。"""

    id: str = Field(  # messages.id を保持する
        ...,  # 必須項目であることを示す
        description="メッセージID（UUID）",  # ドキュメント用途の説明
    )  # フィールド定義をここで閉じる
    original: str = Field(  # 元のメッセージを保持する
        ...,  # 必須項目であることを示す
        description="元のメッセージ（クレーマー入力）",  # ドキュメント用途の説明
    )  # フィールド定義をここで閉じる
    converted: str = Field(  # 変換後のメッセージを保持する
        ...,  # 必須項目であることを示す
        description="毒抜き後の丁寧なビジネス敬語メッセージ",  # ドキュメント用途の説明
    )  # フィールド定義をここで閉じる
    aggressionScore: float = Field(  # 攻撃性スコアを保持する
        ...,  # 必須項目であることを示す
        description="攻撃性スコア（0.0=冷静〜1.0=激昂）",  # ドキュメント用途の説明
        ge=0.0,  # 範囲外の値を弾いて UI/ロジックの整合性を守る
        le=1.0,  # 範囲外の値を弾いて UI/ロジックの整合性を守る
    )  # フィールド定義をここで閉じる
    createdAt: str = Field(  # 作成日時を保持する
        ...,  # 必須項目であることを示す
        description="作成日時（ISO 文字列）",  # ドキュメント用途の説明
    )  # フィールド定義をここで閉じる
    replySuggestion: str | None = Field(  # 返信案を保持する（過去データ互換のため None 許容）
        None,
        description="工務店側の返信案",  # ドキュメント用途の説明
    )  # フィールド定義をここで閉じる


class CustomerStats(BaseModel):  # 顧客別統計の 1 行を表す
    """顧客ごとの統計（平均スコア/件数/最終日時）を表すモデル。"""

    customerId: str = Field(  # 顧客IDを保持する
        ...,  # 必須項目であることを示す
        description="顧客ID（customers.id）",  # ドキュメント用途の説明
    )  # フィールド定義をここで閉じる
    avgAggressionScore: float = Field(  # 平均攻撃性スコアを保持する
        ...,  # 必須項目であることを示す
        description="顧客の平均攻撃性スコア",  # ドキュメント用途の説明
        ge=0.0,  # 範囲外の値を弾いて UI/ロジックの整合性を守る
        le=1.0,  # 範囲外の値を弾いて UI/ロジックの整合性を守る
    )  # フィールド定義をここで閉じる
    messageCount: int = Field(  # 累計メッセージ数を保持する
        ...,  # 必須項目であることを示す
        description="顧客の累計メッセージ数",  # ドキュメント用途の説明
        ge=0,  # 負の件数を弾いて整合性を守る
    )  # フィールド定義をここで閉じる
    lastMessageAt: str | None = Field(  # 最終送信日時を保持する
        None,  # メッセージが無い顧客は None になりうる
        description="顧客の最終送信日時（ISO 文字列）",  # ドキュメント用途の説明
    )  # フィールド定義をここで閉じる


class CustomerRecord(BaseModel):  # customers テーブルの 1 レコードを表す
    """customers テーブルの 1 レコード（工務店側の一覧/詳細表示用）を表すモデル。"""

    customerId: str = Field(  # customers.id を保持する
        ...,  # 必須項目であることを示す
        description="顧客ID（customers.id）",  # ドキュメント用途の説明
    )  # フィールド定義をここで閉じる
    displayName: str = Field(  # customers.display_name を保持する
        ...,  # 必須項目であることを示す
        description="顧客表示名（暫定名を含む）",  # ドキュメント用途の説明
        min_length=1,  # 空文字を弾いて表示の破綻を防ぐ
    )  # フィールド定義をここで閉じる
    createdAt: str = Field(  # customers.created_at を保持する
        ...,  # 必須項目であることを示す
        description="顧客作成日時（ISO 文字列）",  # ドキュメント用途の説明
    )  # フィールド定義をここで閉じる


class CustomerListItem(BaseModel):  # 工務店の顧客一覧に必要な集計情報を含むモデル
    """工務店画面の顧客一覧に必要な情報（表示名+統計）を表すモデル。"""

    customerId: str = Field(  # 顧客IDを保持する
        ...,  # 必須項目であることを示す
        description="顧客ID（customers.id）",  # ドキュメント用途の説明
    )  # フィールド定義をここで閉じる
    displayName: str = Field(  # 顧客表示名を保持する
        ...,  # 必須項目であることを示す
        description="顧客表示名（暫定名を含む）",  # ドキュメント用途の説明
    )  # フィールド定義をここで閉じる
    avgAggressionScore: float = Field(  # 平均攻撃性スコアを保持する
        ...,  # 必須項目であることを示す
        description="顧客の平均攻撃性スコア",  # ドキュメント用途の説明
        ge=0.0,  # 範囲外の値を弾いて整合性を守る
        le=1.0,  # 範囲外の値を弾いて整合性を守る
    )  # フィールド定義をここで閉じる
    messageCount: int = Field(  # 累計メッセージ数を保持する
        ...,  # 必須項目であることを示す
        description="顧客の累計メッセージ数",  # ドキュメント用途の説明
        ge=0,  # 負の件数を弾いて整合性を守る
    )  # フィールド定義をここで閉じる
    lastMessageAt: str | None = Field(  # 最終送信日時を保持する
        None,  # メッセージが無い顧客は None になりうる
        description="顧客の最終送信日時（ISO 文字列）",  # ドキュメント用途の説明
    )  # フィールド定義をここで閉じる
    createdAt: str = Field(  # 顧客作成日時を保持する
        ...,  # 必須項目であることを示す
        description="顧客作成日時（ISO 文字列）",  # ドキュメント用途の説明
    )  # フィールド定義をここで閉じる


class UpdateCustomerRequest(BaseModel):  # 顧客表示名の更新リクエストを表す
    """顧客表示名の更新リクエストを表すモデル。"""

    displayName: str = Field(  # 新しい表示名を保持する
        ...,  # 必須項目であることを示す
        description="更新後の顧客表示名",  # ドキュメント用途の説明
        min_length=1,  # 空文字を弾いて表示の破綻を防ぐ
    )  # フィールド定義をここで閉じる
