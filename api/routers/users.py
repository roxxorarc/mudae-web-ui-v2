from fastapi import APIRouter, HTTPException

from api import serializers
from db import repository as repo

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("")
async def list_users():
    rows = await repo.list_users_with_counts()
    return [
        {**serializers.user_profile(r), "characterCount": r["characterCount"]}
        for r in rows
    ]


@router.get("/{discord_id}")
async def get_user(discord_id: str):
    row = await repo.get_user_profile(discord_id)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return serializers.user_profile(row)


@router.get("/{discord_id}/characters")
async def user_characters(discord_id: str):
    rows = await repo.list_user_characters(discord_id)
    return [serializers.character(r) for r in rows]
