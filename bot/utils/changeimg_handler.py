import os
import logging

import discord
import httpx

from bot.utils.patterns import MUDAE_BOT_ID, CHANGEIMG_PATTERN

logger = logging.getLogger("MudaeBot")


async def handle_changeimg_command(message: discord.Message) -> None:
    if message.author.id == MUDAE_BOT_ID:
        logger.debug("[CHANGEIMG] Ignoring message from Mudae bot")
        return

    match = CHANGEIMG_PATTERN.match(message.content)
    if not match:
        logger.debug(f"[CHANGEIMG] Pattern did not match: {message.content}")
        return

    character_name = match.group(1).strip()
    img_number = int(match.group(2))

    logger.info(f"[CHANGEIMG] Processing $changeimg command: character=\"{character_name}\", imgNumber={img_number}, user={message.author.name}")

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")

    try:
        logger.info(f"\U0001f310 Calling Supabase edge function for character: {character_name}")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{supabase_url}/functions/v1/change-character-image",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {supabase_anon_key}",
                },
                json={
                    "characterName": character_name,
                    "imgNumber": img_number,
                },
            )

        if response.status_code != 200:
            try:
                error_data = response.json()
            except Exception:
                error_data = {"error": "Unknown error"}
            raise Exception(f"Edge function error: {response.status_code} - {error_data.get('error', response.reason_phrase)}")

        result = response.json()

        if result.get("success"):
            logger.info(f"\U0001f5bc\ufe0f Successfully changed image for {character_name} to {img_number}")
            await message.add_reaction("\U0001f44c")
        else:
            logger.warning(f"\u26a0\ufe0f Edge function reported failure: {result.get('message', 'Unknown reason')}")
            await message.add_reaction("\u274c")
    except Exception as e:
        logger.error(f"\u274c Error handling $changeimg command: {e}")
        await message.add_reaction("\u274c")
