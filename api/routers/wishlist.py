from fastapi import APIRouter, HTTPException, Query

from api import serializers
from db import repository as repo

router = APIRouter(tags=["wishlist"])


@router.get("/api/wishlist/{user_id}")
async def get_wishlist(user_id: str):
    rows = await repo.list_wishlist(user_id)
    return [serializers.wishlist_item(r) for r in rows]


@router.get("/api/wishers")
async def get_wishers(characterIds: str = Query("")):
    try:
        ids = [int(part) for part in characterIds.split(",") if part.strip()]
    except ValueError:
        raise HTTPException(status_code=422, detail="characterIds must be a comma-separated list of integers")
    if not ids:
        return {}
    rows = await repo.get_wishers(ids)
    result: dict[str, list[str]] = {}
    for row in rows:
        result.setdefault(str(row["characterId"]), []).append(row["userId"])
    return result
