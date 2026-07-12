import secrets
import time
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse

from api import serializers
from api.deps import require_user
from api.settings import (
    COOKIE_SECURE,
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    FRONTEND_URL,
    PUBLIC_API_URL,
    SESSION_COOKIE,
    SESSION_MAX_AGE,
    SESSION_SECRET,
)
from db import repository as repo

router = APIRouter(prefix="/api/auth", tags=["auth"])

DISCORD_AUTHORIZE_URL = "https://discord.com/oauth2/authorize"
DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token"
DISCORD_ME_URL = "https://discord.com/api/users/@me"

STATE_COOKIE = "oauth_state"
REDIRECT_URI = f"{PUBLIC_API_URL}/api/auth/callback"


def _session_cookie_kwargs() -> dict:
    return {
        "httponly": True,
        "samesite": "lax",
        "secure": COOKIE_SECURE,
        "path": "/",
    }


@router.get("/login")
async def login():
    state = secrets.token_urlsafe(32)
    params = urlencode(
        {
            "client_id": DISCORD_CLIENT_ID,
            "response_type": "code",
            "scope": "identify",
            "redirect_uri": REDIRECT_URI,
            "state": state,
        }
    )
    response = RedirectResponse(f"{DISCORD_AUTHORIZE_URL}?{params}", status_code=302)
    response.set_cookie(STATE_COOKIE, state, max_age=600, **_session_cookie_kwargs())
    return response


@router.get("/callback")
async def callback(request: Request, code: str = "", state: str = ""):
    expected_state = request.cookies.get(STATE_COOKIE)
    if not code or not state or not expected_state or not secrets.compare_digest(state, expected_state):
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    async with httpx.AsyncClient(timeout=10) as client:
        token_response = await client.post(
            DISCORD_TOKEN_URL,
            data={
                "client_id": DISCORD_CLIENT_ID,
                "client_secret": DISCORD_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_response.status_code != 200:
            raise HTTPException(status_code=502, detail="Discord token exchange failed")
        access_token = token_response.json()["access_token"]

        me_response = await client.get(
            DISCORD_ME_URL, headers={"Authorization": f"Bearer {access_token}"}
        )
        if me_response.status_code != 200:
            raise HTTPException(status_code=502, detail="Discord user fetch failed")
        me = me_response.json()

    discord_id = me["id"]
    username = me.get("global_name") or me.get("username")
    avatar = me.get("avatar")

    await repo.upsert_user_profile(discord_id, username, avatar)

    now = int(time.time())
    token = jwt.encode(
        {"sub": discord_id, "iat": now, "exp": now + SESSION_MAX_AGE},
        SESSION_SECRET,
        algorithm="HS256",
    )

    response = RedirectResponse(FRONTEND_URL, status_code=302)
    response.delete_cookie(STATE_COOKIE, path="/")
    response.set_cookie(SESSION_COOKIE, token, max_age=SESSION_MAX_AGE, **_session_cookie_kwargs())
    return response


@router.get("/me")
async def me(discord_id: str = Depends(require_user)):
    profile = await repo.get_user_profile(discord_id)
    if not profile:
        raise HTTPException(status_code=401, detail="Unknown user")
    return serializers.user_profile(profile)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"status": "ok"}
