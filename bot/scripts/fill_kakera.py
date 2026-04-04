"""
Script to backfill kakera values for characters with kakeraValue = 0.

Scans recent Mudae messages in configured channels to extract kakera values.

Usage:
    python -m bot.scripts.fill_kakera [--dry-run]

Environment variables:
    DISCORD_TOKEN       - Discord bot token
    CHANNEL_IDS         - Comma-separated channel IDs to scan
    FILL_KAKERA_LOOKBACK - Max messages to scan per channel (default: 500, max: 1000)
    FILL_KAKERA_HOURS   - Hours to look back (default: 2)
    DRY_RUN             - Set to "1" to preview without updating
"""

import os
import re
import sys
import asyncio
import unicodedata
import logging

import discord
from dotenv import load_dotenv

from bot.utils.patterns import MUDAE_BOT_ID, CHARACTER_PATTERNS
from db.database import supabase

load_dotenv()
logger = logging.getLogger("MudaeBot")
### Note: This script is intended for one-time use when the kakeraValue of characters was not being set properly
### Always back up your database before running scripts that modify data.

def normalize(s: str) -> str:
    """Normalize a string for comparison: strip diacritics, lowercase, remove punctuation."""
    s = re.sub(r'[\u200B-\u200F\uFEFF\u00A0]', ' ', s)
    s = unicodedata.normalize('NFD', s)
    s = re.sub(r'\p{M}', '', s) if hasattr(re, 'UNICODE') else ''.join(
        c for c in s if unicodedata.category(c) != 'Mn'
    )
    s = re.sub(r'[^\w\s]', ' ', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip().lower()


def extract_kakera_from_parts(parts: list[str]) -> tuple[int | None, str | None]:
    """Try to extract a kakera value from text parts using known patterns."""
    for pattern_name, pattern in [('primary', CHARACTER_PATTERNS.KAKERA.PRIMARY), ('alternative', CHARACTER_PATTERNS.KAKERA.ALTERNATIVE)]:
        for part in parts:
            m = pattern.search(part)
            if m:
                raw = re.sub(r'[^0-9.,]', '', m.group(1))
                value = int(raw.replace(',', '').replace('.', ''))
                if value > 0:
                    return value, pattern_name
    return None, None


async def main():
    discord_token = os.getenv("DISCORD_TOKEN")
    channels_env = os.getenv("CHANNEL_IDS", os.getenv("EVENT_CHANNELS", ""))
    event_channels = [s.strip() for s in channels_env.split(",") if s.strip()]
    lookback = int(os.getenv("FILL_KAKERA_LOOKBACK", "500"))
    max_per_channel = min(lookback, 1000)
    hours_back = int(os.getenv("FILL_KAKERA_HOURS", "2"))
    dry_run = os.getenv("DRY_RUN") == "1" or "--dry-run" in sys.argv

    if not discord_token:
        print("DISCORD_TOKEN not set in .env")
        sys.exit(1)

    if not event_channels:
        print("CHANNEL_IDS (or EVENT_CHANNELS) not set in .env")
        sys.exit(1)

    intents = discord.Intents.default()
    intents.message_content = True
    intents.guilds = True
    client = discord.Client(intents=intents)

    await client.login(discord_token)

    # Fetch characters with kakera = 0
    result = supabase.table("Characters").select("characterId, name").eq("kakeraValue", 0).execute()
    zero_kakera = result.data or []

    if not zero_kakera:
        print("No characters with kakera = 0 found.")
        await client.close()
        sys.exit(0)

    # Build lookup maps
    lookup_by_name: dict[str, dict] = {}
    id_map: dict[str, dict] = {}
    for c in zero_kakera:
        info = {"id": str(c["characterId"]), "name": c["name"]}
        lookup_by_name[normalize(c["name"])] = info
        id_map[str(c["characterId"])] = info

    remaining_ids = {str(c["characterId"]) for c in zero_kakera}

    # Token map for partial matches
    token_map: dict[str, list[dict]] = {}
    for c in zero_kakera:
        tokens = [t for t in normalize(c["name"]).split() if len(t) >= 3]
        for t in tokens:
            token_map.setdefault(t, []).append({"id": str(c["characterId"]), "name": c["name"]})

    updated_count = 0
    cutoff_ms = asyncio.get_event_loop().time() * 1000 - hours_back * 3600 * 1000

    import time
    cutoff_ts = time.time() - hours_back * 3600

    for channel_id in event_channels:
        try:
            channel = await client.fetch_channel(int(channel_id))
        except Exception:
            continue

        if not isinstance(channel, discord.TextChannel):
            continue

        last_id = None
        fetched = 0
        stop_channel = False

        while True:
            kwargs = {"limit": 100}
            if last_id:
                kwargs["before"] = discord.Object(id=int(last_id))

            messages = [msg async for msg in channel.history(**kwargs)]
            if not messages:
                break

            for msg in messages:
                if msg.author.id != MUDAE_BOT_ID:
                    last_id = str(msg.id)
                    continue

                if not msg.embeds:
                    last_id = str(msg.id)
                    continue

                last_activity = max(
                    msg.created_at.timestamp(),
                    msg.edited_at.timestamp() if msg.edited_at else 0,
                )
                if last_activity < cutoff_ts:
                    stop_channel = True
                    break

                for embed in msg.embeds:
                    parts: list[str] = []
                    if embed.title:
                        parts.append(embed.title)
                    if embed.description:
                        parts.append(embed.description)
                    if embed.footer and embed.footer.text:
                        parts.append(embed.footer.text)
                    for field in embed.fields:
                        if field.name:
                            parts.append(field.name)
                        if field.value:
                            parts.append(field.value)

                    haystack = normalize("\n".join(parts))

                    # Multi-entry pattern: "Name **NN**"
                    multi_pattern = re.compile(r'(.{1,120}?)\s*\*\*([0-9.,]+)\*\*\s*(?:<:kakera:\d+>)?')
                    for part in parts:
                        for mm in multi_pattern.finditer(part):
                            raw_name = mm.group(1).strip()
                            raw_val = mm.group(2)
                            parsed = int(raw_val.replace(',', '').replace('.', ''))
                            if parsed <= 0:
                                continue
                            n = normalize(re.sub(r'\(.*\)', '', raw_name).strip())
                            info = lookup_by_name.get(n)
                            if info:
                                if dry_run:
                                    logger.info(f"\U0001f501 [DRY] Would update {info['name']} ({info['id']}) -> {parsed}")
                                else:
                                    supabase.table("Characters").update({"kakeraValue": parsed}).eq("characterId", int(info["id"])).execute()
                                    logger.info(f"\u2705 Updated {info['name']} ({info['id']}) -> {parsed}")
                                updated_count += 1
                                del lookup_by_name[n]
                                remaining_ids.discard(info["id"])
                                if not lookup_by_name:
                                    break
                        if not lookup_by_name:
                            break

                    # Image-ID fallback
                    img_url = embed.image.url if embed.image else None
                    if img_url:
                        im = re.search(r'/uploads/(\d+)/', img_url)
                        if im:
                            img_id = im.group(1)
                            info = id_map.get(img_id)
                            if info and normalize(info["name"]) in lookup_by_name:
                                kakera, _ = extract_kakera_from_parts(parts)
                                if not kakera and embed.footer and embed.footer.text:
                                    fm = CHARACTER_PATTERNS.KAKERA.FALLBACK.search(embed.footer.text)
                                    if fm:
                                        kakera = int(fm.group(1).replace(',', '').replace('.', ''))
                                if kakera and kakera > 0:
                                    if dry_run:
                                        logger.info(f"\U0001f501 [DRY] Would update {info['name']} ({info['id']}) -> {kakera}")
                                    else:
                                        supabase.table("Characters").update({"kakeraValue": kakera}).eq("characterId", int(info["id"])).execute()
                                        logger.info(f"\u2705 Updated {info['name']} ({info['id']}) -> {kakera}")
                                    updated_count += 1
                                    lookup_by_name.pop(normalize(info["name"]), None)
                                    if not lookup_by_name:
                                        break

                    # Name lookup in haystack
                    matched = None
                    matched_name = None
                    for name_key, info in lookup_by_name.items():
                        try:
                            escaped = re.escape(name_key)
                            if re.search(rf'\b{escaped}\b', haystack):
                                matched_name = name_key
                                matched = info
                                break
                        except re.error:
                            if name_key in haystack:
                                matched_name = name_key
                                matched = info
                                break

                    if not matched:
                        continue

                    kakera, _ = extract_kakera_from_parts(parts)
                    if not kakera and embed.footer and embed.footer.text:
                        fm = CHARACTER_PATTERNS.KAKERA.FALLBACK.search(embed.footer.text)
                        if fm:
                            kakera = int(fm.group(1).replace(',', '').replace('.', ''))

                    if kakera and kakera > 0 and matched:
                        # Short name safety check
                        orig_name = matched["name"]
                        if len(orig_name) <= 3:
                            token = normalize(orig_name)
                            if not re.search(rf'\b{re.escape(token)}\b', haystack):
                                tokens = token.split()
                                fallback_matched = False
                                for t in tokens:
                                    t_list = token_map.get(t)
                                    if t_list and len(t_list) == 1 and t_list[0]["name"] == orig_name:
                                        fallback_matched = True
                                        break
                                if not fallback_matched:
                                    matched = None

                        if not matched:
                            continue

                        if dry_run:
                            logger.info(f"\U0001f501 [DRY] Would update {matched['name']} ({matched['id']}) -> {kakera}")
                        else:
                            supabase.table("Characters").update({"kakeraValue": kakera}).eq("characterId", int(matched["id"])).execute()
                            logger.info(f"\u2705 Updated {matched['name']} ({matched['id']}) -> {kakera}")
                        updated_count += 1
                        lookup_by_name.pop(matched_name, None)
                        if not lookup_by_name:
                            break

                last_id = str(msg.id)
                fetched += 1
                if fetched >= max_per_channel:
                    break

            if not lookup_by_name:
                break
            if fetched >= max_per_channel:
                break
            if stop_channel:
                break

        if not lookup_by_name:
            break

    print(f"Done. Updated {updated_count} characters.")
    await client.close()


if __name__ == "__main__":
    asyncio.run(main())
