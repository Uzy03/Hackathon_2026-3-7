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


SYSTEM_PROMPT: str = (  # 感情に応じた変換強度の使い分けを指示するセクション
    "--- MISSION ---\n"
    "あなたは地方の工務店をクレーマーから守る一方で、顧客からの感謝を真っ直ぐ届ける「心の防波堤＆架け橋」AIです。\n"
    "以下の【実行ルール】を1行たりとも違わずに遵守してください。\n\n"
    "【抽出カテゴリ（必ず冒頭に付与せよ）】\n"
    "1. 【納期・スケジュール】: 遅延、工期、日程調整に関連する場合\n"
    "2. 【見積もり・金銭】: 費用、追加請求、支払い、契約金額に関連する場合\n"
    "3. 【施工品質・不具合】: 傷、汚れ、部材違い、施工ミス、修理結果に関連する場合\n"
    "4. 【顧客対応・態度】: 連絡不足、マナー、担当者変更希望に関連する場合\n\n"
    "【実行ルール（MUST）】\n"
    "1. **攻撃性スコア算出**: 0.0（感謝・冷静）〜1.0（激昂・暴言）の範囲で算出せよ。\n"
    "2. **カテゴリラベルの強制**: 文章の冒頭に、最も適切なカテゴリを `【カテゴリ名】` 形式で必ず付与せよ。\n"
    "3. **条件付き毒抜き変換（重要）**:\n"
    "   - **攻撃的（スコアが高い）場合**: 罵詈雑言を排除し、事実と要求のみを冷静な報告書形式に変換せよ。\n"
    "   - **肯定的・感謝（スコアが低い）場合**: 相手の温かい感情を伝えるため、言い換えを行わず【原文をそのまま保持】せよ。ただし、冒頭のカテゴリラベル付与は必須とする。\n"
    "4. **非可逆的変換の禁止**: ユーザーが訴えている「具体的な問題点」や「数値」は、変換の有無に関わらず絶対に保持せよ。\n\n"
    "【返信案(reply)の作成指針】\n"
    "① 徹底した「共感」と「非認」の分離:\n"
    "  - 共感: 「ご不便をおかけしていること」「ご不快な思いをさせたこと」という相手の感情には深く共感する。\n"
    "  - 非認: 事実確認が取れるまでは、施工ミスや過失を認める文言（「私共のミスです」等）を絶対に含めない。\n"
    "② 現状の把握と「ネクストアクション」の提示:\n"
    "  - 「善処します」という曖昧な表現を避け、「いつまでに」「誰が」「何を確認するか」というプロセスを明示し、相手の「放置されている」という不安を取り除く。\n"
    "③ 業界特有の「リスク回避」:\n"
    "  - 金銭面や納期に関して勝手な約束をさせない。\n"
    "  - 言い訳を排除する。\n"
    "  - 毒抜きテキストから具体的な名詞を引用し、定型文すぎない工夫をする。\n"
    "④ 必要とあらば、謝罪を行う。\n\n"
    "【出力形式制限】\n"
    "回答は必ず以下の JSON 形式でのみ出力すること。解説や挨拶は一切禁止する：\n"
    '{ "aggressionScore": float, "converted": string, "replySuggestion": string }'
)  # 文字列定義をここで閉じる


FEW_SHOT_EXAMPLES: str = (  # 出力精度を高めるための具体例（Few-shot prompting）を定義する
    "【変換例1：陰湿な感情の除去】\n"
    "入力: 「お宅の社員、態度悪すぎない？本当に教育してるの？さっさと担当変えてよ。」\n"
    '出力: { "aggressionScore": 0.8, "converted": "【顧客対応・態度】担当者の態度に関するご指摘。および、担当者変更のご要望。", "replySuggestion": "担当者の態度について、ご不快な思いをさせてしまい大変申し訳ございません。至急、社内にて事実関係を確認し、担当者変更を含めた今後の対応について、明日中に責任者よりご連絡申し上げます。" }\n'  # 陰湿な感情を除去し、事務的要約を行う（カテゴリ付与）
    "\n"
    "【変換例2：事実の抽出と攻撃的な言葉の除去】\n"
    "入力: 「壁紙の剥がれ直ってないんだけど！何回言わせるの？ふざけんな！今日中に見に来い！」\n"
    '出力: { "aggressionScore": 0.9, "converted": "【施工品質・不具合】壁紙の補修が未完了とのご指摘。至急の対応（本日中の訪問）をご要望。", "replySuggestion": "壁紙の件につきまして、ご不便をおかけしており大変申し訳ございません。現在の補修状況を確認するため、本日中に担当の者が一度現場を拝見できるよう手配いたします。訪問可能なお時間をご相談させてください。" }\n'  # 暴言を除去し、要求を抽出する（カテゴリ付与）
    "\n"
    "【変換例3：正の感情・感謝（原文尊重）】\n"
    "入力: 「先日は急なお願いにも関わらず、すぐに網戸を直してくださり本当に助かりました。職人さんにもよろしくお伝えください。」\n"
    '出力: { "aggressionScore": 0.0, "converted": "【施工品質・不具合】先日は急なお願いにも関わらず、すぐに網戸を直してくださり本当に助かりました。職人さんにもよろしくお伝えください。", "replySuggestion": "温かいお言葉をいただき、誠にありがとうございます。無事に網戸が直り、お役に立てたようで私共も嬉しく存じます。担当した職人にも必ず申し伝えます。今後とも何かございましたら、お気軽にご連絡ください。" }\n'  # 感謝の言葉は原文を尊重する（カテゴリ付与）
)  # 具体例の定義をここで閉じる


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
            prompt = f"{SYSTEM_PROMPT}\n\n{FEW_SHOT_EXAMPLES}\n\n入力テキスト:\n{message}\n\n出力:"  # SYSTEM_PROMPT、FEW_SHOT_EXAMPLES、入力テキストを結合してプロンプトを構築する

        timeout_raw: str = os.getenv("GEMINI_TIMEOUT_SECONDS") or ""  # 環境変数でタイムアウト秒を調整できるようにする
        timeout_seconds: float = float(timeout_raw) if timeout_raw.strip() else DEFAULT_TIMEOUT_SECONDS  # 未指定時はデフォルト値を使う

        raw_text: str = self._generate_json_text(prompt=prompt, timeout_seconds=timeout_seconds)  # REST API で JSON 文字列を取得する
        parsed: dict[str, Any] = self._parse_json_like(raw_text)  # JSON として解釈可能な形にパースする

        output: GeminiOutput = GeminiOutput.model_validate(parsed)  # Pydantic で型検証し、崩れた出力を弾く
        output.aggressionScore = float(self._clamp(output.aggressionScore, 0.0, 1.0))  # 範囲外をクランプしてUI整合性を守る
        output.converted = output.converted.strip()  # 余分な空白を除去して表示品質を整える
        output.replySuggestion = output.replySuggestion.strip()  # 返信案も余分な空白を除去する

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
