import re
import logging

import discord
import httpx

from db.database import supabase
from bot.utils.patterns import MUDAE_BOT_ID, CHANGEIMG_PATTERN

logger = logging.getLogger("MudaeBot")

MUDAE_IMAGE_URL = "https://mudae.net/character/{character_id}"
IMG_TAG_RE = re.compile(
    r'<section[^>]*id=["\']images["\'][^>]*>.*?<ul[^>]*>(.*?)</ul>.*?</section>',
    re.IGNORECASE | re.DOTALL,
)
SRC_RE = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)


async def _fetch_character_images(character_id: int) -> list[str]:
    url = MUDAE_IMAGE_URL.format(character_id=character_id)
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; MudaeWebUI/1.0)"}, follow_redirects=True)
        response.raise_for_status()
    html = response.text
    section_match = IMG_TAG_RE.search(html)
    if not section_match:
        return []
    ul_content = section_match.group(1)
    images = []
    for src in SRC_RE.findall(ul_content):
        absolute = src if src.startswith("http") else f"https://mudae.net{src}"
        images.append(absolute)
    return images


async def handle_changeimg_command(message: discord.Message) -> None:
    if message.author.id == MUDAE_BOT_ID:
        return

    match = CHANGEIMG_PATTERN.match(message.content)
    if not match:
        return

    character_name = match.group(1).strip()
    img_number = int(match.group(2))

    logger.info(f"[CHANGEIMG] character=\"{character_name}\" imgNumber={img_number} user={message.author.name}")

    try:
        result = supabase.table("Characters") \
            .select("characterId, name, imageUrl") \
            .ilike("name", character_name) \
            .execute()

        characters = result.data or []
        if not characters:
            logger.warning(f"[CHANGEIMG] Character \"{character_name}\" not found in DB")
            await message.add_reaction("❌")
            return

        if len(characters) > 1:
            logger.warning(f"[CHANGEIMG] Multiple characters matched \"{character_name}\": {len(characters)}")
            await message.add_reaction("❌")
            return

        character = characters[0]
        character_id = character["characterId"]
        logger.debug(f"[CHANGEIMG] Found character: {character['name']} (ID: {character_id})")

        images = await _fetch_character_images(character_id)
        logger.debug(f"[CHANGEIMG] Found {len(images)} images for character")

        if not images:
            logger.warning(f"[CHANGEIMG] No images found for character {character_id}")
            await message.add_reaction("❌")
            return

        if img_number < 1 or img_number > len(images):
            logger.warning(f"[CHANGEIMG] Invalid image number {img_number}, available: 1-{len(images)}")
            await message.add_reaction("❌")
            return

        new_image_url = images[img_number - 1]
        supabase.table("Characters").update({"imageUrl": new_image_url}).eq("characterId", character_id).execute()

        logger.info(f"[CHANGEIMG] Updated {character['name']} → image {img_number}: {new_image_url}")
        await message.add_reaction("👌")

    except Exception as e:
        logger.error(f"[CHANGEIMG] Error: {e}", exc_info=True)
        await message.add_reaction("❌")
