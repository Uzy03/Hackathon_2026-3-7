"""FastAPI 入出力のスキーマ定義を集約するモジュール。"""

from pydantic import BaseModel, Field  # Pydantic の基底クラスとフィールド定義を読み込む


class ConvertRequest(BaseModel):  # /api/convert の入力スキーマを表す
    """/api/convert のリクエストボディ（入力）を表すモデル。"""

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
