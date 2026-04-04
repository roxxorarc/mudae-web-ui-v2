import re
import logging
from datetime import datetime, timezone

import discord

from bot.utils.patterns import MUDAE_BOT_ID, CHARACTER_PATTERNS
from bot.config.constants import LOG_EMOJIS, LOG_MESSAGES
from db.database import supabase

logger = logging.getLogger("MudaeBot")


def detect_message_type(embed: discord.Embed) -> str:
    """Detect Mudae message type: 'mmi', 'roll', or 'unknown'."""
    footer_text = embed.footer.text if embed.footer else None
    image_url = embed.image.url if embed.image else None

    logger.debug(
        f"[DETECT TYPE] author={bool(embed.author)} footer={repr(footer_text)} "
        f"description={bool(embed.description)} image_url={bool(image_url)}"
    )

    # $mmi: footer contains "X / Y" (character position in harem)
    if footer_text and re.search(r'\d+\s*/\s*\d+', footer_text):
        return 'mmi'

    # $ma/$mm roll: has character author name + description
    # Footer may or may not be present in modern Mudae, so we don't require its absence
    if embed.author and embed.author.name and embed.description:
        return 'roll'

    return 'unknown'


def extract_character_id(image_url: str | None) -> str | None:
    if not image_url:
        return None
    match = re.search(r'/uploads/(\d+)/', image_url)
    return match.group(1) if match else None


def extract_series(description: str | None) -> str:
    if not description:
        return ''
    lines = description.split('\n')
    if not lines:
        return ''
    return CHARACTER_PATTERNS.CUSTOM_EMOJI.sub('', lines[0]).strip()


def extract_kakera(description: str | None, footer: str | None) -> int | None:
    if description:
        primary_match = CHARACTER_PATTERNS.KAKERA.PRIMARY.search(description)
        if primary_match:
            return int(primary_match.group(1).replace(',', '').replace('.', ''))

        alt_match = CHARACTER_PATTERNS.KAKERA.ALTERNATIVE.search(description)
        if alt_match:
            return int(alt_match.group(1).replace(',', '').replace('.', ''))

    if footer:
        fallback_match = CHARACTER_PATTERNS.KAKERA.FALLBACK.search(footer)
        if fallback_match:
            return int(fallback_match.group(1).replace(',', '').replace('.', ''))

    return None


def extract_owner(footer: str | None, guild: discord.Guild | None) -> str | None:
    if not footer or not guild:
        return None

    match = CHARACTER_PATTERNS.OWNER.FRENCH.search(footer) or CHARACTER_PATTERNS.OWNER.ENGLISH.search(footer)
    if not match:
        return None

    owner_name = match.group(1).strip().lower()
    for member in guild.members:
        if (member.name.lower() == owner_name
                or member.display_name.lower() == owner_name
                or (member.global_name and member.global_name.lower() == owner_name)):
            return str(member.id)

    return None


async def handle_mudae_message(message: discord.Message) -> None:
    if message.author.id != MUDAE_BOT_ID:
        return

    if not message.embeds:
        logger.debug("[MUDAE LISTENER] No embeds found in message")
        return

    embed = message.embeds[0]
    character_name = None
    if embed.author and embed.author.name:
        character_name = embed.author.name
    elif embed.title:
        character_name = embed.title

    if not character_name:
        logger.debug("[MUDAE LISTENER] Could not extract character name from embed")
        return

    message_type = detect_message_type(embed)
    if message_type == 'unknown':
        logger.debug("[MUDAE LISTENER] Unknown message type, skipping")
        return

    logger.debug(f"[MUDAE LISTENER] Detected {message_type} message for character: {character_name}")

    image_url = embed.image.url if embed.image else None
    character_id = extract_character_id(image_url)
    if not character_id:
        logger.debug(f"[MUDAE LISTENER] Could not extract character ID from image URL: {image_url}")
        return

    series = extract_series(embed.description)
    footer_text = embed.footer.text if embed.footer else None
    kakera_value = extract_kakera(embed.description, footer_text)
    owner_id = extract_owner(footer_text, message.guild) if message_type == 'mmi' else None

    logger.debug(
        f"[MUDAE LISTENER] Extracted data - ID: {character_id}, Name: {character_name}, "
        f"Series: {series}, Kakera: {kakera_value}, Owner: {owner_id}"
    )

    await _save_character(
        character_id=character_id,
        name=character_name,
        series=series,
        image_url=image_url or '',
        kakera_value=kakera_value,
        owner_id=owner_id,
        message_type=message_type,
    )


async def _save_character(
    character_id: str,
    name: str,
    series: str,
    image_url: str,
    kakera_value: int | None,
    owner_id: str | None,
    message_type: str,
) -> None:
    try:
        logger.debug(f"[MUDAE LISTENER] Saving character {name} (type: {message_type})")
        result = supabase.table("Characters").select("*").eq("characterId", int(character_id)).maybe_single().execute()
        existing = result.data

        if existing:
            logger.debug(f"[MUDAE LISTENER] Character exists in DB: {name}")
        else:
            logger.debug(f"[MUDAE LISTENER] Character is NEW: {name}")

        if message_type == 'roll' and existing:
            logger.debug(f"[MUDAE LISTENER] Processing roll update for {name}")
            await _update_roll_character(existing, name, image_url, kakera_value, character_id)
            return

        await _upsert_character(
            character_id=character_id,
            name=name,
            series=series,
            image_url=image_url,
            kakera_value=kakera_value,
            owner_id=owner_id,
            existing=existing,
            log_changes=message_type == 'mmi',
        )
    except Exception as e:
        logger.error(f"Error saving character {name}: {e}")


async def _update_roll_character(
    existing: dict,
    name: str,
    image_url: str,
    kakera_value: int | None,
    character_id: str,
) -> None:
    updates = {}

    if image_url and existing.get("imageUrl") != image_url:
        updates["imageUrl"] = image_url

    if kakera_value and existing.get("kakeraValue") != kakera_value:
        updates["kakeraValue"] = kakera_value

    if updates:
        supabase.table("Characters").update(updates).eq("characterId", int(character_id)).execute()

        changes = []
        if "kakeraValue" in updates:
            changes.append(f"kakera: {existing.get('kakeraValue')} \u2192 {kakera_value}")
        if "imageUrl" in updates:
            changes.append("image")

        logger.info(f"{LOG_EMOJIS['character']} {LOG_MESSAGES.character.updated(name, changes)}")


async def _upsert_character(
    character_id: str,
    name: str,
    series: str,
    image_url: str,
    kakera_value: int | None,
    owner_id: str | None,
    existing: dict | None,
    log_changes: bool,
) -> None:
    now = datetime.now(timezone.utc).isoformat()

    data = {
        "characterId": int(character_id),
        "userId": owner_id,
        "name": name,
        "series": series,
        "imageUrl": image_url,
        "kakeraValue": kakera_value if kakera_value is not None else 0,
    }

    if not existing:
        data["addedAt"] = now

    supabase.table("Characters").upsert(data, on_conflict="characterId").execute()

    if log_changes and existing:
        changes = []
        if existing.get("userId") != owner_id:
            changes.append(f"owner: {existing.get('userId') or 'none'} \u2192 {owner_id or 'none'}")
        if kakera_value is not None and existing.get("kakeraValue") != kakera_value:
            changes.append(f"kakera: {existing.get('kakeraValue')} \u2192 {kakera_value}")
        if existing.get("imageUrl") != image_url:
            changes.append("image")

        if changes:
            logger.info(f"{LOG_EMOJIS['character']} {LOG_MESSAGES.character.updated(name, changes)}")
