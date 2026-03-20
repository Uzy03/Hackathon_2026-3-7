"""Render などの PaaS で repo ルート起動された場合のエントリポイント。"""  # uvicorn main:app を成立させる

from __future__ import annotations  # 型ヒントの前方参照を安全に扱う

from backend.main import app  # backend/main.py の FastAPI アプリを公開する

