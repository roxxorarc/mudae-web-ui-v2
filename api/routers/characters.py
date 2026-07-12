from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from api import serializers
from api.deps import require_user
from api.services.images import get_character_images
from db import repository as repo

router = APIRouter(prefix="/api/characters", tags=["characters"])


class OrderUpdate(BaseModel):
    characterId: int
    newOrder: int


@router.get("")
async def list_characters(
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0),
    sort: Literal["recent", "name", "kakera", "custom"] = "kakera",
    order: Literal["asc", "desc"] = "desc",
    userId: str | None = None,
    owned: bool | None = None,
    search: str | None = None,
):
    rows = await repo.list_characters(
        limit=limit,
        offset=offset,
        sort=sort,
        order=order,
        user_id=userId,
        owned=owned,
        search=search,
    )
    return [serializers.character(r) for r in rows]


@router.put("/order")
async def update_order(
    updates: list[OrderUpdate], discord_id: str = Depends(require_user)
):
    now = datetime.now(timezone.utc)
    count = await repo.set_display_order(
        discord_id, [(u.characterId, u.newOrder) for u in updates], now
    )
    return {"updated": count}


@router.get("/{character_id}")
async def get_character(character_id: int):
    row = await repo.get_character(character_id)
    if not row:
        raise HTTPException(status_code=404, detail="Character not found")
    return serializers.character(row)


@router.get("/{character_id}/images")
async def character_images(character_id: int):
    return await get_character_images(character_id)
