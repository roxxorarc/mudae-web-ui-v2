"""Async data access layer on Postgres (psycopg3).

Shared by the FastAPI backend and the Discord bot.
All camelCase identifiers must stay double-quoted in SQL.
"""

from typing import Any

from db.pool import get_pool

CHARACTER_COLUMNS = (
    '"userId", "characterId", name, series, "imageUrl", "kakeraValue", '
    '"addedAt", "claimedAt", "displayOrder", "orderUpdatedAt"'
)

# Columns allowed in update_character / upsert_character payloads
_CHARACTER_WRITABLE = {
    "userId",
    "name",
    "series",
    "imageUrl",
    "kakeraValue",
    "addedAt",
    "claimedAt",
    "displayOrder",
    "orderUpdatedAt",
}

_SORT_SQL = {
    "name": 'name {dir}',
    "kakera": '"kakeraValue" {dir} NULLS LAST, name ASC',
    "custom": '"displayOrder" {dir} NULLS LAST, "addedAt" ASC',
    "recent": '"claimedAt" {dir}, "addedAt" {dir}',
}


def _quote(column: str) -> str:
    if column not in _CHARACTER_WRITABLE:
        raise ValueError(f"Unknown Characters column: {column}")
    return f'"{column}"'


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


# ── Characters ────────────────────────────────────────────────


async def get_character(character_id: int) -> dict | None:
    async with get_pool().connection() as conn:
        cur = await conn.execute(
            f'SELECT {CHARACTER_COLUMNS} FROM public."Characters" WHERE "characterId" = %s',
            (character_id,),
        )
        return await cur.fetchone()


async def list_characters(
    *,
    limit: int = 24,
    offset: int = 0,
    sort: str = "kakera",
    order: str = "desc",
    user_id: str | None = None,
    owned: bool | None = None,
    search: str | None = None,
) -> list[dict]:
    where = []
    params: list[Any] = []

    if user_id:
        where.append('"userId" = %s')
        params.append(user_id)
    if owned is True:
        where.append('"userId" IS NOT NULL AND "userId" <> \'\'')
    elif owned is False:
        where.append('("userId" IS NULL OR "userId" = \'\')')
    if search:
        pattern = f"%{_escape_like(search)}%"
        where.append("(name ILIKE %s OR series ILIKE %s)")
        params.extend([pattern, pattern])

    direction = "ASC" if order == "asc" else "DESC"
    order_by = _SORT_SQL.get(sort, _SORT_SQL["recent"]).format(dir=direction)
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""

    query = (
        f'SELECT {CHARACTER_COLUMNS} FROM public."Characters" '
        f"{where_sql} ORDER BY {order_by} LIMIT %s OFFSET %s"
    )
    params.extend([limit, offset])

    async with get_pool().connection() as conn:
        cur = await conn.execute(query, params)
        return await cur.fetchall()


async def list_user_characters(discord_id: str) -> list[dict]:
    async with get_pool().connection() as conn:
        cur = await conn.execute(
            f'SELECT {CHARACTER_COLUMNS} FROM public."Characters" '
            'WHERE "userId" = %s '
            'ORDER BY "displayOrder" ASC NULLS LAST, "addedAt" ASC',
            (discord_id,),
        )
        return await cur.fetchall()


async def get_characters_by_names(names: list[str]) -> list[dict]:
    if not names:
        return []
    async with get_pool().connection() as conn:
        cur = await conn.execute(
            f'SELECT {CHARACTER_COLUMNS} FROM public."Characters" WHERE name = ANY(%s)',
            (names,),
        )
        return await cur.fetchall()


async def find_characters_ilike(name: str) -> list[dict]:
    """Case-insensitive exact name match."""
    async with get_pool().connection() as conn:
        cur = await conn.execute(
            f'SELECT {CHARACTER_COLUMNS} FROM public."Characters" WHERE name ILIKE %s',
            (_escape_like(name),),
        )
        return await cur.fetchall()


async def upsert_character(data: dict) -> None:
    """INSERT ... ON CONFLICT ("characterId") DO UPDATE.

    "addedAt" is only written on insert (when present in data), never on
    conflict — preserves the original claim date.
    """
    if "characterId" not in data:
        raise ValueError("upsert_character requires characterId")

    columns = ['"characterId"'] + [_quote(k) for k in data if k != "characterId"]
    values = [data["characterId"]] + [v for k, v in data.items() if k != "characterId"]
    updates = [
        f"{_quote(k)} = EXCLUDED.{_quote(k)}"
        for k in data
        if k not in ("characterId", "addedAt")
    ]

    placeholders = ", ".join(["%s"] * len(columns))
    query = (
        f'INSERT INTO public."Characters" ({", ".join(columns)}) '
        f"VALUES ({placeholders}) "
        f'ON CONFLICT ("characterId") DO UPDATE SET {", ".join(updates)}'
    )

    async with get_pool().connection() as conn:
        await conn.execute(query, values)


async def update_character(character_id: int, **fields: Any) -> int:
    if not fields:
        return 0
    assignments = ", ".join(f"{_quote(k)} = %s" for k in fields)
    async with get_pool().connection() as conn:
        cur = await conn.execute(
            f'UPDATE public."Characters" SET {assignments} WHERE "characterId" = %s',
            [*fields.values(), character_id],
        )
        return cur.rowcount


async def set_owner_by_names(names: list[str], user_id: str, claimed_at: Any) -> int:
    if not names:
        return 0
    async with get_pool().connection() as conn:
        cur = await conn.execute(
            'UPDATE public."Characters" SET "userId" = %s, "claimedAt" = %s WHERE name = ANY(%s)',
            (user_id, claimed_at, names),
        )
        return cur.rowcount


async def clear_owner(user_id: str, names: list[str]) -> int:
    if not names:
        return 0
    async with get_pool().connection() as conn:
        cur = await conn.execute(
            'UPDATE public."Characters" SET "userId" = NULL, "claimedAt" = NULL '
            'WHERE "userId" = %s AND name = ANY(%s)',
            (user_id, names),
        )
        return cur.rowcount


async def swap_owners(
    left_names: list[str],
    left_new_owner: str,
    right_names: list[str],
    right_new_owner: str,
    claimed_at: Any,
) -> None:
    """Trade: both owner updates in a single transaction."""
    async with get_pool().connection() as conn:
        async with conn.transaction():
            await conn.execute(
                'UPDATE public."Characters" SET "userId" = %s, "claimedAt" = %s WHERE name = ANY(%s)',
                (left_new_owner, claimed_at, left_names),
            )
            await conn.execute(
                'UPDATE public."Characters" SET "userId" = %s, "claimedAt" = %s WHERE name = ANY(%s)',
                (right_new_owner, claimed_at, right_names),
            )


async def set_display_order(
    discord_id: str, updates: list[tuple[int, int]], updated_at: Any
) -> int:
    """Apply (characterId, newOrder) updates transactionally, scoped to owner."""
    count = 0
    async with get_pool().connection() as conn:
        async with conn.transaction():
            for character_id, new_order in updates:
                cur = await conn.execute(
                    'UPDATE public."Characters" '
                    'SET "displayOrder" = %s, "orderUpdatedAt" = %s '
                    'WHERE "characterId" = %s AND "userId" = %s',
                    (new_order, updated_at, character_id, discord_id),
                )
                count += cur.rowcount
    return count


async def list_zero_kakera_characters() -> list[dict]:
    async with get_pool().connection() as conn:
        cur = await conn.execute(
            'SELECT "characterId", name FROM public."Characters" WHERE "kakeraValue" = 0'
        )
        return await cur.fetchall()


# ── Users ─────────────────────────────────────────────────────


async def get_user_profile(discord_id: str) -> dict | None:
    async with get_pool().connection() as conn:
        cur = await conn.execute(
            'SELECT "discordId", "discordUsername", "discordAvatar" '
            'FROM public.user_profiles WHERE "discordId" = %s',
            (discord_id,),
        )
        return await cur.fetchone()


async def ensure_user_profile(discord_id: str, username: str | None = None) -> bool:
    """Create the profile if missing. Returns True when a row was inserted."""
    async with get_pool().connection() as conn:
        cur = await conn.execute(
            'INSERT INTO public.user_profiles ("discordId", "discordUsername") '
            'VALUES (%s, %s) ON CONFLICT ("discordId") DO NOTHING',
            (discord_id, username or "Unknown"),
        )
        return cur.rowcount > 0


async def upsert_user_profile(
    discord_id: str, username: str | None, avatar: str | None
) -> None:
    async with get_pool().connection() as conn:
        await conn.execute(
            'INSERT INTO public.user_profiles ("discordId", "discordUsername", "discordAvatar") '
            "VALUES (%s, %s, %s) "
            'ON CONFLICT ("discordId") DO UPDATE SET '
            '"discordUsername" = EXCLUDED."discordUsername", '
            '"discordAvatar" = EXCLUDED."discordAvatar", '
            "updated_at = CURRENT_TIMESTAMP",
            (discord_id, username, avatar),
        )


async def list_users_with_counts() -> list[dict]:
    async with get_pool().connection() as conn:
        cur = await conn.execute(
            'SELECT p."discordId", p."discordUsername", p."discordAvatar", '
            'COUNT(c."characterId") AS "characterCount" '
            "FROM public.user_profiles p "
            'JOIN public."Characters" c ON c."userId" = p."discordId" '
            'GROUP BY p."discordId", p."discordUsername", p."discordAvatar" '
            'ORDER BY "characterCount" DESC',
        )
        return await cur.fetchall()


# ── Wishlist ──────────────────────────────────────────────────


async def list_wishlist(user_id: str) -> list[dict]:
    async with get_pool().connection() as conn:
        cur = await conn.execute(
            'SELECT id, "userId", "characterId", "addedAt" '
            'FROM public."Wishlist" WHERE "userId" = %s ORDER BY "addedAt" DESC',
            (user_id,),
        )
        return await cur.fetchall()


async def add_wish(user_id: str, character_id: int) -> None:
    async with get_pool().connection() as conn:
        await conn.execute(
            'INSERT INTO public."Wishlist" ("userId", "characterId") VALUES (%s, %s) '
            'ON CONFLICT ("userId", "characterId") DO NOTHING',
            (user_id, character_id),
        )


async def remove_wish(user_id: str, character_id: int) -> int:
    async with get_pool().connection() as conn:
        cur = await conn.execute(
            'DELETE FROM public."Wishlist" WHERE "userId" = %s AND "characterId" = %s',
            (user_id, character_id),
        )
        return cur.rowcount


async def get_wishers(character_ids: list[int]) -> list[dict]:
    if not character_ids:
        return []
    async with get_pool().connection() as conn:
        cur = await conn.execute(
            'SELECT "characterId", "userId" FROM public."Wishlist" WHERE "characterId" = ANY(%s)',
            (character_ids,),
        )
        return await cur.fetchall()


# ── Character images cache ────────────────────────────────────


async def get_images_cache(character_id: int) -> dict | None:
    async with get_pool().connection() as conn:
        cur = await conn.execute(
            'SELECT "characterId", images, cached_at '
            'FROM public.character_images_cache WHERE "characterId" = %s',
            (character_id,),
        )
        return await cur.fetchone()


async def upsert_images_cache(character_id: int, images: list[str]) -> None:
    async with get_pool().connection() as conn:
        await conn.execute(
            'INSERT INTO public.character_images_cache ("characterId", images, cached_at) '
            "VALUES (%s, %s, CURRENT_TIMESTAMP) "
            'ON CONFLICT ("characterId") DO UPDATE SET '
            "images = EXCLUDED.images, cached_at = CURRENT_TIMESTAMP",
            (character_id, images),
        )
