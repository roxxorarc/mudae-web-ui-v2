from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from api import serializers
from api.deps import require_user
from db import repository as repo

router = APIRouter(tags=["wishlist"])


class WishCreate(BaseModel):
    characterId: int


@router.get("/api/wishlist/{user_id}")
async def get_wishlist(user_id: str):
    rows = await repo.list_wishlist(user_id)
    return [serializers.wishlist_item(r) for r in rows]


@router.post("/api/wishlist")
async def add_wish(body: WishCreate, discord_id: str = Depends(require_user)):
    await repo.add_wish(discord_id, body.characterId)
    return {"status": "ok"}


@router.delete("/api/wishlist/{character_id}")
async def remove_wish(character_id: int, discord_id: str = Depends(require_user)):
    await repo.remove_wish(discord_id, character_id)
    return {"status": "ok"}


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
