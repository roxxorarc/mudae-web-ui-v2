"""Row → JSON helpers. characterId is a bigint that can exceed 2^53,
so it is always serialized as a string."""

from datetime import datetime
from typing import Any


def _iso(value: Any) -> Any:
    return value.isoformat() if isinstance(value, datetime) else value


def character(row: dict) -> dict:
    return {
        "userId": row["userId"],
        "characterId": str(row["characterId"]),
        "name": row["name"],
        "series": row["series"],
        "imageUrl": row["imageUrl"],
        "kakeraValue": row["kakeraValue"],
        "addedAt": _iso(row["addedAt"]),
        "claimedAt": _iso(row["claimedAt"]),
        "displayOrder": row["displayOrder"],
        "orderUpdatedAt": _iso(row["orderUpdatedAt"]),
    }


def user_profile(row: dict) -> dict:
    return {
        "discordId": row["discordId"],
        "discordUsername": row["discordUsername"],
        "discordAvatar": row["discordAvatar"],
    }


def wishlist_item(row: dict) -> dict:
    return {
        "id": row["id"],
        "userId": row["userId"],
        "characterId": str(row["characterId"]),
        "addedAt": _iso(row["addedAt"]),
    }
