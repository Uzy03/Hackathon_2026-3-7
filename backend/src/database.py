"""Supabase を用いた永続化（顧客/メッセージ/統計）を担うモジュール。"""  # 本ファイルの責務を宣言する

from __future__ import annotations  # 型ヒントで前方参照を扱いやすくする

import os  # 環境変数から Supabase 設定を取得するために使用する
import re  # Supabase のエラーメッセージから列名を抽出するために使用する
from datetime import datetime  # created_at の比較に使用する
from typing import Any, Optional, TypedDict  # 型安全な実装のために使用する

from dotenv import load_dotenv  # .env を読み込んでローカル開発を容易にする
from supabase import Client, create_client  # Supabase クライアント生成に使用する
from postgrest.exceptions import APIError  # PostgREST 由来の API エラーを検知するために使用する


class SupabaseDatabase:  # Supabase との通信を単一責任で担うクラス
    """Supabase を介して customers/messages の読み書きと統計集計を行うクラス。"""

    class KnowledgeMatch(TypedDict):  # match_knowledge RPC の返却を型で固定する
        id: str  # knowledge.id を表す
        content: str  # knowledge.content を表す
        similarity: float  # 類似度（0.0〜1.0）を表す

    class KnowledgeRecord(TypedDict, total=False):
        id: str
        content: str
        category: str
        embedding: str

    def __init__(self) -> None:  # 環境変数を読み取り、Supabase クライアントを初期化する
        """Supabase クライアントを初期化する。"""

        load_dotenv()  # backend/.env を読み込んで環境変数に反映する

        supabase_url: Optional[str] = os.getenv("SUPABASE_URL")  # Issue 指定の URL を読み込む
        supabase_anon_key: Optional[str] = os.getenv("SUPABASE_ANON_KEY")  # Issue 指定の ANON KEY を読み込む

        if not supabase_url:  # 互換性のため旧名も許容する
            supabase_url = os.getenv("PROJECT_URL")  # 旧 env 名（ユーザーが入力済みの可能性）を読む
        if not supabase_anon_key:  # 互換性のため旧名も許容する
            supabase_anon_key = os.getenv("PUBLISHED_KEY")  # 旧 env 名（ユーザーが入力済みの可能性）を読む

        if not supabase_url:  # URL が無い場合は設定不足としてエラーにする
            raise RuntimeError("SUPABASE_URL が未設定です。backend/.env を設定してください。")  # 失敗理由を明示する
        if not supabase_anon_key:  # KEY が無い場合は設定不足としてエラーにする
            raise RuntimeError("SUPABASE_ANON_KEY が未設定です。backend/.env を設定してください。")  # 失敗理由を明示する

        self._client: Client = create_client(supabase_url, supabase_anon_key)  # Supabase クライアントを生成する

    def match_knowledge(self, query_embedding: list[float], match_threshold: float, match_count: int) -> list[KnowledgeMatch]:  # knowledge をベクトル類似度で検索する
        """Supabase の match_knowledge RPC を呼び出して関連知識を返す。

        Args:
            query_embedding: 埋め込みベクトル（vector(768) を想定）。
            match_threshold: 類似度の閾値（これ未満は除外する）。
            match_count: 取得件数の上限。

        Returns:
            list[KnowledgeMatch]: 類似度の高い knowledge の配列。
        """

        if not query_embedding:  # 空の埋め込みは検索不能なので弾く
            raise ValueError("query_embedding は必須です。")  # 呼び出し側に入力不正を通知する

        embedding_literal: str = "[" + ",".join(f"{float(v):.8f}" for v in query_embedding) + "]"  # PostgREST 経由で vector を渡せる形へ文字列化する
        payload: dict[str, Any] = {  # RPC へ渡す引数を辞書で構築する
            "query_embedding": embedding_literal,  # SQL 側の query_embedding 引数へ渡す
            "match_threshold": float(match_threshold),  # 閾値は float に正規化して渡す
            "match_count": int(match_count),  # 件数は int に正規化して渡す
        }  # payload 定義をここで閉じる

        result = self._client.rpc("match_knowledge", payload).execute()  # RPC を実行して類似検索を行う
        rows: list[dict[str, Any]] = list(result.data or [])  # None を空配列として扱う

        matches: list[SupabaseDatabase.KnowledgeMatch] = []  # 型付きの返却配列を用意する
        for row in rows:  # 返却行を走査して型を整える
            matches.append(  # 1件ずつ整形して追加する
                {  # TypedDict の形に合わせて返す
                    "id": str(row.get("id") or ""),  # id を文字列化して入れる
                    "content": str(row.get("content") or ""),  # content を文字列化して入れる
                    "similarity": float(row.get("similarity") or 0.0),  # similarity を float 化して入れる
                }  # 1件分の辞書をここで閉じる
            )  # append をここで閉じる

        return matches  # 整形済みの配列を返す

    def find_knowledge_id_by_content(self, content: str) -> str | None:
        normalized: str = content.strip()
        if not normalized:
            return None
        found = (
            self._client
            .table("knowledge")
            .select("id")
            .eq("content", normalized)
            .limit(1)
            .execute()
        )
        if found.data and len(found.data) > 0:
            return str(found.data[0].get("id") or "")
        return None

    def upsert_knowledge(self, content: str, embedding: list[float] | None, category: str | None) -> str:
        normalized: str = content.strip()
        if not normalized:
            raise ValueError("content は必須です。")

        existing_id = self.find_knowledge_id_by_content(normalized)
        embedding_literal: str | None = None
        if embedding is not None:
            embedding_literal = "[" + ",".join(f"{float(v):.8f}" for v in embedding) + "]"

        payload: dict[str, Any] = {"content": normalized}
        if category is not None and category.strip():
            payload["category"] = category.strip()
        if embedding_literal is not None:
            payload["embedding"] = embedding_literal

        if existing_id:
            updated = (
                self._client
                .table("knowledge")
                .update(payload)
                .eq("id", existing_id)
                .execute()
            )
            if updated.data and len(updated.data) > 0:
                return str(updated.data[0].get("id") or existing_id)
            return existing_id

        created = self._client.table("knowledge").insert(payload).execute()
        if not created.data or len(created.data) == 0:
            raise RuntimeError("knowledge の作成に失敗しました。")
        return str(created.data[0].get("id") or "")

    def delete_all_knowledge(self) -> int:
        result = (
            self._client
            .table("knowledge")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000")
            .execute()
        )
        return len(list(result.data or []))

    def get_or_create_customer_id(self, session_id: str) -> str:  # session_id から顧客 ID を確定する
        """session_id をキーに customers を検索し、存在しなければ作成して id を返す。

        Args:
            session_id: ブラウザ単位で生成・保持される一意のセッションID。

        Returns:
            str: customers.id（UUID 文字列）。
        """

        normalized: str = session_id.strip()  # 前後の空白を除去して検索の揺れを防ぐ
        if not normalized:  # 空文字は識別に使えないため弾く
            raise ValueError("session_id は必須です。")  # 呼び出し側に入力不正を通知する

        found = (  # 既存顧客がいるかを問い合わせる
            self._client  # Supabase クライアントを参照する
            .table("customers")  # customers テーブルを対象にする
            .select("id")  # id のみ取得する
            .eq("session_id", normalized)  # session_id が一致する行に絞る
            .limit(1)  # 1件だけで十分なので制限する
            .execute()  # クエリを実行する
        )  # 取得結果をここで閉じる

        if found.data and len(found.data) > 0:  # 既存顧客が見つかった場合
            return str(found.data[0]["id"])  # 先頭の id を返す

        payload: dict[str, Any] = {"session_id": normalized}  # 作成に必要な最小 payload を用意する

        try:  # まずは最小 payload で upsert を試す（同時実行でも衝突しにくい）
            upserted = (  # 競合（同時作成）に備えて upsert で作成する
                self._client  # Supabase クライアントを参照する
                .table("customers")  # customers テーブルを対象にする
                .upsert(  # session_id をキーに存在しなければ insert する
                    payload,  # 作成 payload を渡す
                    on_conflict="session_id",  # session_id がユニークである前提で競合解決する
                )  # upsert 条件をここで閉じる
                .execute()  # クエリを実行する（returning=representation がデフォルトなので行が返る）
            )  # 作成結果をここで閉じる
        except APIError as api_error:  # NOT NULL 制約などの Supabase 側エラーを捕捉する
            missing_column: Optional[str] = self._extract_not_null_column(api_error)  # 不足している NOT NULL 列名を抽出する
            if missing_column == "display_name":  # display_name が必須の場合は安全な既定値を補う
                payload["display_name"] = f"匿名顧客-{normalized[:8]}"  # 個人情報を含まない短い表示名を生成する
                upserted = (  # display_name を補って再試行する
                    self._client  # Supabase クライアントを参照する
                    .table("customers")  # customers テーブルを対象にする
                    .upsert(  # session_id をキーに存在しなければ insert する
                        payload,  # 補完済み payload を渡す
                        on_conflict="session_id",  # session_id がユニークである前提で競合解決する
                    )  # upsert 条件をここで閉じる
                    .execute()  # クエリを実行する
                )  # 作成結果をここで閉じる
            else:  # 想定外の必須列の場合は、列名を含めてエラーにする
                raise RuntimeError(f"customers の必須カラムが不足しています: {missing_column or api_error}")  # スキーマの前提差分を明示する

        if not upserted.data or len(upserted.data) == 0:  # 返却に行が含まれない場合はフォールバックで再取得する
            refetch = (  # 念のため再取得して id を得る
                self._client  # Supabase クライアントを参照する
                .table("customers")  # customers テーブルを対象にする
                .select("id")  # id のみ取得する
                .eq("session_id", normalized)  # session_id が一致する行に絞る
                .limit(1)  # 1件だけで十分なので制限する
                .execute()  # クエリを実行する
            )  # 再取得結果をここで閉じる
            if refetch.data and len(refetch.data) > 0:  # 再取得できた場合
                return str(refetch.data[0]["id"])  # 取得した id を返す
            raise RuntimeError("customers の作成に失敗しました。")  # 原因を明示して呼び出し側で扱えるようにする

        return str(upserted.data[0]["id"])  # 作成（または既存）した顧客 ID を返す

    def insert_message(self, customer_id: str, original: str, converted: str, aggression_score: float) -> str:  # messages を追加する
        """messages テーブルへ 1 件保存し、生成された id を返す。

        Args:
            customer_id: customers.id（UUID 文字列）。
            original: 元のメッセージ（クレーマー入力）。
            converted: 毒抜き後のメッセージ。
            aggression_score: 攻撃性スコア（0.0〜1.0）。

        Returns:
            str: messages.id（UUID 文字列）。
        """

        payload: dict[str, Any] = {  # 挿入する payload を定義する
            "customer_id": customer_id,  # 顧客IDを紐づける
            "original_text": original,  # 生メッセージを保存する（スキーマ: original_text）
            "converted_text": converted,  # 変換結果を保存する（スキーマ: converted_text）
            "aggression_score": float(aggression_score),  # スコアを保存する（float に正規化）
        }  # payload 定義をここで閉じる

        try:  # insert は NOT NULL 制約などで失敗しうるため例外を捕捉する
            created = (  # メッセージを挿入する
                self._client  # Supabase クライアントを参照する
                .table("messages")  # messages テーブルを対象にする
                .insert(payload)  # payload を挿入する（returning=representation がデフォルトなので行が返る）
                .execute()  # クエリを実行する
            )  # 挿入結果をここで閉じる
        except APIError as api_error:  # スキーマ差分などの Supabase 側エラーを捕捉する
            missing_column: Optional[str] = self._extract_not_null_column(api_error)  # 不足している NOT NULL 列名を抽出する
            raise RuntimeError(f"messages の保存に失敗しました（必須カラム不足の可能性）: {missing_column or api_error}")  # 原因を明示して呼び出し側で扱えるようにする

        if not created.data or len(created.data) == 0:  # id が返らない場合は異常とする
            raise RuntimeError("messages の作成に失敗しました。")  # 原因を明示して呼び出し側で扱えるようにする

        return str(created.data[0]["id"])  # 生成された messages.id を返す

    def list_messages_by_customer_id(self, customer_id: str, limit: int = 100) -> list[dict[str, Any]]:  # 顧客に紐づく履歴を返す
        """customer_id に紐づく messages を新しい順に取得する。

        Args:
            customer_id: customers.id（UUID 文字列）。
            limit: 取得件数の上限（デフォルト 100）。

        Returns:
            list[dict[str, Any]]: Supabase の行データ（辞書）の配列。
        """

        result = (  # messages を取得する
            self._client  # Supabase クライアントを参照する
            .table("messages")  # messages テーブルを対象にする
            .select("id, customer_id, original_text, converted_text, aggression_score, created_at")  # 必要な列のみ取得する
            .eq("customer_id", customer_id)  # 顧客IDで絞り込む
            .order("created_at", desc=True)  # 新しい順に並べる
            .limit(int(limit))  # 上限件数を適用する
            .execute()  # クエリを実行する
        )  # 取得結果をここで閉じる

        return list(result.data or [])  # data が None の場合も空配列で返す

    def list_customer_stats(self, limit: int = 1000) -> list[dict[str, Any]]:  # 顧客別の統計を返す
        """顧客別の統計（平均スコア/件数/最終送信日時）を集計して返す。

        Args:
            limit: 対象 messages の最大取得件数（MVP は Python 集計のため上限を設ける）。

        Returns:
            list[dict[str, Any]]: customer_id ごとの統計を表す辞書配列。
        """

        raw = (  # messages の必要列を一括で取得する
            self._client  # Supabase クライアントを参照する
            .table("messages")  # messages テーブルを対象にする
            .select("customer_id, aggression_score, converted_text, created_at")  # 集計に必要な列のみ取得する
            .order("created_at", desc=True)  # 新しい順に取得する
            .limit(int(limit))  # 上限件数を適用する
            .execute()  # クエリを実行する
        )  # 取得結果をここで閉じる

        rows: list[dict[str, Any]] = list(raw.data or [])  # None を空にして扱いやすくする

        import json
        buckets: dict[str, dict[str, Any]] = {}  # customer_id ごとの集計バケツを用意する
        for row in rows:  # 各メッセージ行を走査して集計する
            cid: str = str(row.get("customer_id"))  # customer_id を文字列化してキーにする
            score: float = float(row.get("aggression_score") or 0.0)  # スコアを float 化して加算できるようにする
            created_at_raw: str = str(row.get("created_at") or "")  # created_at を文字列として保持する
            converted_text = str(row.get("converted_text") or "")
            
            urgency = 1
            politeness_val, clarity_val, specificity_val, emotional_val, financial_val = 3, 3, 3, 3, 1
            if converted_text.startswith("{") and converted_text.endswith("}"):
                try:
                    parsed = json.loads(converted_text)
                    urgency = int(parsed.get("urgency", parsed.get("importance", 1)))
                    politeness_val = parsed.get("politeness", 3)
                    clarity_val = parsed.get("clarity", 3)
                    specificity_val = parsed.get("specificity", 3)
                    emotional_val = parsed.get("emotionalStability", 3)
                    financial_val = parsed.get("financialDemand", 1)
                except (json.JSONDecodeError, ValueError):
                    pass

            avg_metrics = (politeness_val + clarity_val + specificity_val + emotional_val + financial_val) / 5.0

            if cid not in buckets:  # 初回の顧客ならバケツを初期化する
                buckets[cid] = {  # 集計値を初期化する
                    "customerId": cid,  # 返却用のキー（camelCase）を作る
                    "messageCount": 0,  # 件数の初期値を入れる
                    "scoreSum": 0.0,  # 合計スコアの初期値を入れる
                    "maxUrgency": 1, # 最大緊急度の初期値を入れる
                    "starsSum": 0.0, # 星の合計の初期値を入れる
                    "lastMessageAt": created_at_raw,  # 最新日時の初期値を入れる
                    "lastMessageAtParsed": self._parse_datetime(created_at_raw),  # 比較用に datetime へ変換する
                }  # 初期化をここで閉じる

            bucket = buckets[cid]  # 当該顧客のバケツを参照する
            bucket["messageCount"] = int(bucket["messageCount"]) + 1  # 件数を加算する
            bucket["scoreSum"] = float(bucket["scoreSum"]) + score  # 合計スコアを加算する
            bucket["maxUrgency"] = max(int(bucket["maxUrgency"]), urgency) # 最大緊急度を更新する
            bucket["starsSum"] = float(bucket["starsSum"]) + avg_metrics # 星の合計を加算する

            current_dt: Optional[datetime] = self._parse_datetime(created_at_raw)  # 今回行の日時をパースする
            last_dt: Optional[datetime] = bucket.get("lastMessageAtParsed")  # 既存の最新日時を取得する
            if current_dt and (not last_dt or current_dt > last_dt):  # より新しければ更新する
                bucket["lastMessageAt"] = created_at_raw  # 表示用の文字列を更新する
                bucket["lastMessageAtParsed"] = current_dt  # 比較用の datetime を更新する

        stats: list[dict[str, Any]] = []  # 返却用の配列を作る
        for cid, bucket in buckets.items():  # 集計済みバケツを走査する
            count: int = int(bucket["messageCount"])  # 件数を取り出す
            score_sum: float = float(bucket["scoreSum"])  # 合計スコアを取り出す
            max_urgency: int = int(bucket["maxUrgency"])
            stars_sum: float = float(bucket["starsSum"])
            avg: float = (score_sum / count) if count > 0 else 0.0  # 平均を計算する（0除算を避ける）
            avg_stars: float = (stars_sum / count) if count > 0 else 0.0  # 星の平均を計算する

            stats.append(  # 返却要素として追加する
                {  # API 返却のキーに揃える
                    "customerId": cid,  # 顧客IDを入れる
                    "avgAggressionScore": avg,  # 平均スコアを入れる
                    "maxUrgency": max_urgency,  # 最大緊急度を入れる
                    "avgStars": avg_stars, # 平均星数を入れる
                    "messageCount": count,  # 件数を入れる
                    "lastMessageAt": bucket.get("lastMessageAt") or None,  # 最終日時を入れる
                }  # 要素定義をここで閉じる
            )  # append をここで閉じる

        stats.sort(key=lambda x: (x.get("lastMessageAt") or ""), reverse=True)  # 最終日時の新しい順に並べ替える
        return stats  # 統計一覧を返す

    def list_customers(self, limit: int = 200) -> list[dict[str, Any]]:  # customers の一覧を返す
        """customers テーブルの一覧を取得して返す。

        Args:
            limit: 取得件数の上限（デフォルト 200）。

        Returns:
            list[dict[str, Any]]: customers の行データ（辞書）の配列。
        """

        result = (  # customers を取得する
            self._client  # Supabase クライアントを参照する
            .table("customers")  # customers テーブルを対象にする
            .select("id, display_name, created_at")  # 工務店一覧に必要な列のみ取得する
            .order("created_at", desc=True)  # 新しい顧客順に並べる
            .limit(int(limit))  # 上限件数を適用する
            .execute()  # クエリを実行する
        )  # 取得結果をここで閉じる

        return list(result.data or [])  # data が None の場合も空配列で返す

    def list_customers_with_stats(self, customer_limit: int = 200, stats_limit: int = 5000) -> list[dict[str, Any]]:  # 顧客一覧に統計を合成して返す
        """工務店用の顧客一覧（表示名 + 統計）を返す。

        Args:
            customer_limit: customers 取得件数の上限。
            stats_limit: 統計計算に使う messages 取得件数の上限。

        Returns:
            list[dict[str, Any]]: CustomerListItem 互換の辞書配列。
        """

        customers: list[dict[str, Any]] = self.list_customers(limit=customer_limit)  # customers を取得する
        stats: list[dict[str, Any]] = self.list_customer_stats(limit=stats_limit)  # messages から統計を取得する

        by_customer_id: dict[str, dict[str, Any]] = {str(s.get("customerId")): s for s in stats}  # 統計を customerId で索引化する

        merged: list[dict[str, Any]] = []  # 返却用の配列を作る
        for c in customers:  # customers を走査して統計を合成する
            cid: str = str(c.get("id"))  # customers.id を文字列化する
            display_name: str = str(c.get("display_name") or "匿名顧客")  # 表示名が無い場合の既定値を用意する
            created_at: str = str(c.get("created_at") or "")  # created_at を文字列として保持する

            stat: dict[str, Any] = by_customer_id.get(cid) or {}  # 統計が無い顧客は空辞書として扱う
            merged.append(  # 合成結果を 1 行として追加する
                {  # API 返却のキーを camelCase で統一する
                    "customerId": cid,  # 顧客IDを入れる
                    "displayName": display_name,  # 顧客表示名を入れる
                    "avgAggressionScore": float(stat.get("avgAggressionScore") or 0.0),  # 平均スコアを入れる（無ければ 0）
                    "maxUrgency": int(stat.get("maxUrgency") or 1),  # 最大緊急度を入れる（無ければ 1）
                    "avgStars": float(stat.get("avgStars") or 0.0), # 平均星数を入れる（無ければ 0）
                    "messageCount": int(stat.get("messageCount") or 0),  # 件数を入れる（無ければ 0）
                    "lastMessageAt": stat.get("lastMessageAt") or None,  # 最終日時を入れる（無ければ None）
                    "createdAt": created_at,  # 顧客作成日時も入れて並び替えや詳細表示に使えるようにする
                }  # 行定義をここで閉じる
            )  # append をここで閉じる

        merged.sort(  # 最終メッセージ日時の新しい順で並べる
            key=lambda x: (x.get("lastMessageAt") or x.get("createdAt") or ""),  # 最終日時が無い場合は作成日時で代替する
            reverse=True,  # 新しい順にする
        )  # sort をここで閉じる

        return merged  # 合成済みの一覧を返す

    def update_customer_display_name(self, customer_id: str, display_name: str) -> dict[str, Any]:  # 顧客表示名を更新して返す
        """customers.display_name を更新して更新後レコードを返す。

        Args:
            customer_id: customers.id（UUID 文字列）。
            display_name: 更新後の表示名。

        Returns:
            dict[str, Any]: 更新後の customers レコード（辞書）。
        """

        normalized_id: str = customer_id.strip()  # ID の前後空白を除去する
        normalized_name: str = display_name.strip()  # 表示名の前後空白を除去する
        if not normalized_id:  # 空文字の ID は更新できないため弾く
            raise ValueError("customer_id は必須です。")  # 呼び出し側に入力不正を通知する
        if not normalized_name:  # 空文字の表示名は更新できないため弾く
            raise ValueError("display_name は必須です。")  # 呼び出し側に入力不正を通知する

        updated = (  # 更新を実行する
            self._client  # Supabase クライアントを参照する
            .table("customers")  # customers テーブルを対象にする
            .update({"display_name": normalized_name})  # display_name を更新する
            .eq("id", normalized_id)  # 対象 ID に絞る
            .select("id, display_name, created_at")  # 更新後レコードを返してもらう
            .limit(1)  # 1件のみで十分なので制限する
            .execute()  # クエリを実行する
        )  # 更新結果をここで閉じる

        if not updated.data or len(updated.data) == 0:  # 更新対象が無い場合は異常とする
            raise RuntimeError("customers の更新に失敗しました。")  # 原因を明示して呼び出し側で扱えるようにする

        return dict(updated.data[0])  # 更新後レコードを辞書として返す

    def _parse_datetime(self, value: str) -> Optional[datetime]:  # ISO 文字列を datetime に変換する
        """Supabase の created_at（ISO 文字列）を datetime に変換する。

        Args:
            value: ISO 形式の日時文字列。

        Returns:
            Optional[datetime]: パースできた場合は datetime、失敗時は None。
        """

        if not value:  # 空文字はパースできないため None を返す
            return None  # 早期 return で分岐を単純化する
        try:  # ISO フォーマットをパースする
            return datetime.fromisoformat(value.replace("Z", "+00:00"))  # Z 末尾を +00:00 に置換して Python で扱える形にする
        except ValueError:  # パース不能な形式の場合
            return None  # 比較不能として None を返す

    def _extract_not_null_column(self, api_error: APIError) -> Optional[str]:  # NOT NULL 違反の列名を抽出する
        """PostgREST の NOT NULL 違反エラーから列名を抽出する。

        Args:
            api_error: postgrest.exceptions.APIError。

        Returns:
            Optional[str]: 列名を抽出できた場合は列名、抽出できない場合は None。
        """

        message: str = ""  # 解析対象のメッセージ文字列を初期化する
        try:  # APIError が dict を持つ場合に備えて取り出す
            message = str(api_error.args[0].get("message") or "")  # message があればそれを使う
        except Exception:  # 取り出せない場合は文字列化にフォールバックする
            message = str(api_error)  # そのまま文字列化して使う

        match = re.search(r'null value in column \"([^\"]+)\"', message)  # 代表的な NOT NULL 違反メッセージから列名を抽出する
        if not match:  # 想定パターンで抽出できない場合
            return None  # None を返して呼び出し側で扱えるようにする
        return match.group(1)  # 抽出した列名を返す
