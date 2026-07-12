import jwt
from fastapi import HTTPException, Request

from api.settings import SESSION_COOKIE, SESSION_SECRET


def require_user(request: Request) -> str:
    """Return the authenticated user's Discord id from the session cookie."""
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SESSION_SECRET, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session")
    return payload["sub"]
