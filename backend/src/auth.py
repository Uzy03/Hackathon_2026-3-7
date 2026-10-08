"""Verify Supabase sessions and server-managed roles before accessing data."""

import os
import threading
import time
from collections import deque
from pathlib import Path
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client
from supabase.lib.client_options import ClientOptions

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
bearer = HTTPBearer(auto_error=False)


def require_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
):
    if os.getenv("APP_ENABLED", "false").lower() != "true":
        raise HTTPException(503, "現在このサービスは停止しています。")
    url = (os.getenv("SUPABASE_URL") or "").strip()
    key = (os.getenv("SUPABASE_ANON_KEY") or "").strip()
    if not url or not key:
        raise HTTPException(503, "認証が設定されていません。")
    if credentials is None:
        raise HTTPException(401, "ログインが必要です。", headers={"WWW-Authenticate": "Bearer"})
    try:
        # Use a separate client per request: never share mutable login sessions.
        client = create_client(url, key, options=ClientOptions(
            persist_session=False, auto_refresh_token=False,
        ))
        user = client.auth.get_user(credentials.credentials).user
    except Exception:
        # Do not expose auth-provider responses or tokens to clients.
        raise HTTPException(401, "セッションを確認できません。") from None
    if user is None or not user.id or getattr(user, "is_anonymous", False):
        raise HTTPException(401, "ログインが必要です。")
    return user


def require_admin(user=Depends(require_user)):
    # user_metadata is user-editable and MUST NOT grant administrative access.
    if (user.app_metadata or {}).get("role") != "admin":
        raise HTTPException(403, "管理者権限が必要です。")
    return user


_conversion_requests: dict[str, deque[float]] = {}
_rate_lock = threading.Lock()


def limit_conversion(user=Depends(require_user)):
    """Bound Gemini requests per authenticated user (single-process limit)."""
    now = time.monotonic()
    with _rate_lock:
        for identity in list(_conversion_requests):
            if not _conversion_requests[identity] or _conversion_requests[identity][-1] <= now - 60:
                del _conversion_requests[identity]
        recent = _conversion_requests.setdefault(user.id, deque())
        while recent and recent[0] <= now - 60:
            recent.popleft()
        if len(recent) >= 12:
            raise HTTPException(429, "しばらく待ってから再送信してください。", headers={"Retry-After": "60"})
        recent.append(now)
    return user
