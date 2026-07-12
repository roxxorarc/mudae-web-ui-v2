"""One-shot migration: copy data from the old Supabase Postgres into the
self-hosted Postgres.

Usage:
    SUPABASE_DB_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" \
    DATABASE_URL="postgresql://mudae:password@localhost:5432/mudae" \
    python -m db.scripts.migrate_from_supabase

The target schema must already exist (db/migrations/). Safe to re-run:
every insert is an upsert.
"""

import os
import sys

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

load_dotenv()

USER_COLUMNS = ["id", "discordId", "discordUsername", "discordDiscriminator",
                "discordAvatar", "created_at", "updated_at"]
CHARACTER_COLUMNS = ["characterId", "userId", "name", "series", "imageUrl",
                     "kakeraValue", "addedAt", "claimedAt", "displayOrder",
                     "orderUpdatedAt"]
WISHLIST_COLUMNS = ["id", "userId", "characterId", "addedAt", "notes"]
CACHE_COLUMNS = ["characterId", "images", "cached_at"]


def _cols(columns: list[str]) -> str:
    return ", ".join(f'"{c}"' for c in columns)


def _placeholders(columns: list[str]) -> str:
    return ", ".join(["%s"] * len(columns))


def _fetch(src: psycopg.Connection, table: str, columns: list[str]) -> list[dict]:
    with src.cursor(row_factory=dict_row) as cur:
        cur.execute(f'SELECT {_cols(columns)} FROM public."{table}"')
        return cur.fetchall()


def _table_exists(conn: psycopg.Connection, table: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT to_regclass(%s)", (f'public."{table}"',))
        return cur.fetchone()[0] is not None


def _rows(rows: list[dict], columns: list[str]) -> list[tuple]:
    return [tuple(r[c] for c in columns) for r in rows]


def main() -> None:
    src_url = os.getenv("SUPABASE_DB_URL")
    dst_url = os.getenv("DATABASE_URL")

    if not src_url:
        sys.exit("SUPABASE_DB_URL must be set (old Supabase Postgres URI)")
    if not dst_url:
        sys.exit("DATABASE_URL must be set (target Postgres URI)")

    with psycopg.connect(src_url) as src, psycopg.connect(dst_url) as dst:
        users = _fetch(src, "user_profiles", USER_COLUMNS)
        dst.cursor().executemany(
            f'INSERT INTO public.user_profiles ({_cols(USER_COLUMNS)}) '
            f"VALUES ({_placeholders(USER_COLUMNS)}) "
            'ON CONFLICT ("discordId") DO UPDATE SET '
            '"discordUsername" = EXCLUDED."discordUsername", '
            '"discordDiscriminator" = EXCLUDED."discordDiscriminator", '
            '"discordAvatar" = EXCLUDED."discordAvatar", '
            "updated_at = EXCLUDED.updated_at",
            _rows(users, USER_COLUMNS),
        )
        print(f"user_profiles: {len(users)}")

        characters = _fetch(src, "Characters", CHARACTER_COLUMNS)
        dst.cursor().executemany(
            f'INSERT INTO public."Characters" ({_cols(CHARACTER_COLUMNS)}) '
            f"VALUES ({_placeholders(CHARACTER_COLUMNS)}) "
            'ON CONFLICT ("characterId") DO UPDATE SET '
            + ", ".join(f'"{c}" = EXCLUDED."{c}"' for c in CHARACTER_COLUMNS if c != "characterId"),
            _rows(characters, CHARACTER_COLUMNS),
        )
        print(f"Characters: {len(characters)}")

        wishes = _fetch(src, "Wishlist", WISHLIST_COLUMNS)
        dst.cursor().executemany(
            f'INSERT INTO public."Wishlist" ({_cols(WISHLIST_COLUMNS)}) '
            f"VALUES ({_placeholders(WISHLIST_COLUMNS)}) "
            'ON CONFLICT ("userId", "characterId") DO NOTHING',
            _rows(wishes, WISHLIST_COLUMNS),
        )
        dst.execute(
            "SELECT setval('public.\"Wishlist_id_seq\"', "
            'COALESCE((SELECT MAX(id) FROM public."Wishlist"), 0) + 1, false)'
        )
        print(f"Wishlist: {len(wishes)}")

        if _table_exists(src, "character_images_cache"):
            cache = _fetch(src, "character_images_cache", CACHE_COLUMNS)
            dst.cursor().executemany(
                f'INSERT INTO public.character_images_cache ({_cols(CACHE_COLUMNS)}) '
                f"VALUES ({_placeholders(CACHE_COLUMNS)}) "
                'ON CONFLICT ("characterId") DO UPDATE SET '
                "images = EXCLUDED.images, cached_at = EXCLUDED.cached_at",
                _rows(cache, CACHE_COLUMNS),
            )
            print(f"character_images_cache: {len(cache)}")
        else:
            print("character_images_cache: absent on source, skipped")

        dst.commit()
        print("Done.")


if __name__ == "__main__":
    main()
