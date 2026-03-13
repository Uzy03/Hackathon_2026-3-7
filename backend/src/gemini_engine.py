"""Gemini API を呼び出して毒抜き変換と攻撃性スコア算出を行うモジュール。"""

from __future__ import annotations  # 型ヒントで前方参照を扱いやすくする

import json  # Gemini 応答を JSON として扱うために使用する
import os  # 環境変数（GEMINI_API_KEY）取得に使用する
from typing import Any, Optional  # 型安全な実装のために使用する

from dotenv import load_dotenv  # .env から環境変数を読み込む
import requests  # Gemini REST API をタイムアウト付きで呼び出すために使用する

from src.schema import GeminiOutput  # Gemini の JSON 出力を厳密に検証するために使用する


DEFAULT_MODEL_NAME: str = "models/gemini-flash-latest"  # デフォルトで利用する Flash 系モデル名を定義する
DEFAULT_TIMEOUT_SECONDS: float = 45.0  # Gemini 呼び出しのデフォルトタイムアウト秒を定義する
GEMINI_API_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"  # Gemini Developer API のベースURLを定義する


SYSTEM_PROMPT: str = (  # Gemini に与えるシステムプロンプトを定義する
    "あなたは地方の工務店をクレーマーから守る「心の防波堤」AIです。 "  # 役割を明確化して出力品質を安定させる
    "入力されたテキストに対して以下の2点を行ってください： "  # タスクを明確に分解して指示する
    "1) 攻撃性スコアの算出: 0.0（冷静）〜1.0（激昂・暴言）の範囲で数値を出す。 "  # スコアの定義域を固定する
    "2) 毒抜き変換: 相手がどんなに攻撃的でも、その「本質的な要求（例：納期、返金、修正）」のみを抽出し、"  # 非可逆的変換の禁止要件を満たす
    "非常に丁寧で冷静なビジネス敬語に書き換える。暴言や人格否定は完全に削除すること。 "  # UI/業務用途に耐える表現に統一する
    "必ず以下の JSON フォーマットで返答してください： "  # 解析しやすい形で返すことを強制する
    '{ "aggressionScore": float, "converted": string }'  # パース対象のフォーマットを明示する
)  # 文字列定義をここで閉じる


class GeminiEngine:  # Gemini 呼び出しロジックを単一責任で担うクラス
    """Gemini API を利用して「毒抜き」と「攻撃性スコア算出」を行うクラス。"""

    def __init__(self, model_name: str = DEFAULT_MODEL_NAME) -> None:  # モデル名を注入可能にして将来の差し替えに備える
        """Gemini API のクライアント初期化とモデル準備を行う。

        Args:
            model_name: 使用する Gemini モデル名（デフォルトは models/gemini-flash-latest）。
        """

        load_dotenv()  # .env を読み込み、ローカル開発時の設定を簡略化する
        api_key: Optional[str] = os.getenv("GEMINI_API_KEY")  # API キーを環境変数から取得する
        if not api_key:  # API キー未設定は実行不能なので明示的にエラーにする
            raise RuntimeError("GEMINI_API_KEY が未設定です。backend/.env を設定してください。")  # 失敗理由を分かりやすく返す

        self._api_key: str = api_key  # REST API 呼び出しに使用するため API キーを保持する

        env_model: Optional[str] = os.getenv("GEMINI_MODEL")  # 環境変数でモデル名を指定できるようにする
        if model_name == DEFAULT_MODEL_NAME and env_model:  # デフォルト指定時のみ環境変数で上書きする
            model_name = env_model  # 環境指定のモデル名に差し替える

        self._model_name: str = model_name  # 利用モデル名を保持してデバッグや切替に備える
        self._use_system_instruction = False  # REST 呼び出しでは systemInstruction を使わず本文に埋め込む方針とする

    def convert(self, message: str) -> GeminiOutput:  # 入力文から Gemini の JSON 出力を得る
        """入力メッセージを Gemini に渡し、毒抜きと攻撃性スコアを返す。

        Args:
            message: クレーマー入力（生テキスト）。

        Returns:
            GeminiOutput: Gemini の出力（converted, aggressionScore）。
        """

        prompt: str = message  # system_instruction が使える場合は user content をそのまま渡す
        if not self._use_system_instruction:  # system_instruction を使わない場合は本文に埋め込む
            prompt = f"{SYSTEM_PROMPT}\n\n入力テキスト:\n{message}\n\n出力:"  # 期待形式を維持しつつプロンプトを構築する

        timeout_raw: str = os.getenv("GEMINI_TIMEOUT_SECONDS") or ""  # 環境変数でタイムアウト秒を調整できるようにする
        timeout_seconds: float = float(timeout_raw) if timeout_raw.strip() else DEFAULT_TIMEOUT_SECONDS  # 未指定時はデフォルト値を使う

        raw_text: str = self._generate_json_text(prompt=prompt, timeout_seconds=timeout_seconds)  # REST API で JSON 文字列を取得する
        parsed: dict[str, Any] = self._parse_json_like(raw_text)  # JSON として解釈可能な形にパースする

        output: GeminiOutput = GeminiOutput.model_validate(parsed)  # Pydantic で型検証し、崩れた出力を弾く
        output.aggressionScore = float(self._clamp(output.aggressionScore, 0.0, 1.0))  # 範囲外をクランプしてUI整合性を守る
        output.converted = output.converted.strip()  # 余分な空白を除去して表示品質を整える

        return output  # 正規化した結果を返す

    def _generate_json_text(self, prompt: str, timeout_seconds: float) -> str:  # Gemini REST API で JSON 文字列を取得する
        """Gemini REST API を呼び出し、応答テキスト（JSON 文字列）を返す。

        Args:
            prompt: Gemini に渡す入力プロンプト。
            timeout_seconds: HTTP 通信のタイムアウト秒。

        Returns:
            str: Gemini の応答テキスト（JSON 文字列想定）。
        """

        url: str = f"{GEMINI_API_BASE_URL}/{self._model_name}:generateContent"  # generateContent のエンドポイントを組み立てる
        params: dict[str, str] = {"key": self._api_key}  # API キーはクエリとして付与する（Developer API 仕様）
        payload: dict[str, Any] = {  # generateContent のリクエストボディを構築する
            "contents": [  # LLM に渡すコンテンツ配列を定義する
                {  # 1 つ目の user メッセージを定義する
                    "role": "user",  # ロールを user として扱う
                    "parts": [{"text": prompt}],  # テキスト本文として prompt を渡す
                }  # 1 つ目のメッセージ定義をここで閉じる
            ],  # contents 配列をここで閉じる
            "generationConfig": {  # 生成設定を指定して出力の安定性を高める
                "temperature": 0.2,  # 逸脱を減らし JSON 破綻を抑える
                "responseMimeType": "application/json",  # 可能なら JSON での応答を促す
            },  # generationConfig をここで閉じる
        }  # payload 定義をここで閉じる

        response = requests.post(  # HTTP POST で Gemini を呼び出す
            url,  # エンドポイント URL を指定する
            params=params,  # API キーのクエリを付与する
            json=payload,  # JSON ボディを送信する
            timeout=timeout_seconds,  # 応答待ちの上限秒数を指定してハングを防ぐ
        )  # リクエスト呼び出しをここで閉じる

        response.raise_for_status()  # 4xx/5xx を例外化して呼び出し側で扱えるようにする

        data: dict[str, Any] = response.json()  # 応答 JSON を辞書として取得する
        candidates: list[Any] = list(data.get("candidates") or [])  # candidates 配列を安全に取り出す
        if not candidates:  # 候補がない場合は異常として扱う
            raise RuntimeError("Gemini 応答に candidates がありません。")  # 失敗理由を明示する

        content: dict[str, Any] = dict(candidates[0].get("content") or {})  # 先頭候補の content を取り出す
        parts: list[Any] = list(content.get("parts") or [])  # parts 配列を取り出す
        if not parts:  # parts がない場合は異常として扱う
            raise RuntimeError("Gemini 応答に parts がありません。")  # 失敗理由を明示する

        text: str = str(parts[0].get("text") or "")  # parts[0].text を文字列として取り出す
        if not text.strip():  # 空文字の場合は異常として扱う
            raise RuntimeError("Gemini 応答テキストが空です。")  # 失敗理由を明示する

        return text  # JSON 文字列を返す

    def _parse_json_like(self, text: str) -> dict[str, Any]:  # JSON を頑健にパースする補助関数
        """Gemini 応答から JSON を抽出して辞書に変換する。

        Args:
            text: Gemini の生の応答文字列。

        Returns:
            dict[str, Any]: JSON として解釈できた辞書。

        Raises:
            ValueError: JSON が抽出できない場合。
        """

        try:  # まずは素直に JSON として読み込む
            value = json.loads(text)  # JSON を直接パースする
            if isinstance(value, dict):  # 想定するオブジェクト形式か確認する
                return value  # そのまま返す
        except json.JSONDecodeError:  # JSON でない場合は次の手段に切り替える
            pass  # 下の抽出ロジックへ進む

        start: int = text.find("{")  # 最初の { を探して JSON らしい範囲を推定する
        end: int = text.rfind("}")  # 最後の } を探して JSON らしい範囲を推定する
        if start == -1 or end == -1 or end <= start:  # JSON らしい括弧範囲が無い場合は失敗とする
            raise ValueError("Gemini 応答から JSON を抽出できませんでした。")  # 原因を分かりやすく返す

        candidate: str = text[start : end + 1]  # 推定した範囲を切り出して再試行する
        value2 = json.loads(candidate)  # 抽出した文字列を JSON としてパースする
        if not isinstance(value2, dict):  # オブジェクト形式でない場合は失敗とする
            raise ValueError("Gemini 応答の JSON 形式が不正です（object ではありません）。")  # 期待形式を明示する

        return value2  # 解析できた辞書を返す

    def _clamp(self, value: float, low: float, high: float) -> float:  # 数値の範囲制限を行う補助関数
        """数値を指定範囲にクランプする。

        Args:
            value: 入力値。
            low: 下限。
            high: 上限。

        Returns:
            float: 範囲内に収まるように調整した値。
        """

        return max(low, min(high, value))  # 下限・上限を適用して返す
