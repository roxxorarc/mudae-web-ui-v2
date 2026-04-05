import logging
from datetime import datetime, timezone

import discord

from bot.utils.mudae_event_handler import MudaeEventHandler, EventConfig, ensure_user_profile
from bot.utils.patterns import GIVE_PATTERN
from bot.config.constants import LOG_EMOJIS, LOG_MESSAGES

logger = logging.getLogger("MudaeBot")


class GiveHandler(MudaeEventHandler):
    def __init__(self, config: EventConfig):
        super().__init__(config)

    async def handle(self, message: discord.Message) -> None:
        logger.debug(f"[GIVE HANDLER] Processing message with {len(self.extract_text_sources(message))} text sources")
        sources = self.extract_text_sources(message)

        for text in sources:
            match = GIVE_PATTERN.search(text)
            if not match:
                logger.debug(f"[GIVE HANDLER] No match in text: {text[:100]}")
                continue
            logger.debug(f"[GIVE HANDLER] Give pattern matched!")

            character_name = self.clean_name(match.group(1))
            to_user_id = match.group(2)

            to_username = to_user_id
            if message.guild:
                member = message.guild.get_member(int(to_user_id))
                if member:
                    to_username = member.name

            logger.info(f"{LOG_EMOJIS['give']} {LOG_MESSAGES.give.detected(character_name, to_username)}")

            try:
                if not ensure_user_profile(to_user_id, to_username):
                    logger.warning(
                        f"{LOG_EMOJIS['warning']} Could not upsert user_profile for {to_username} ({to_user_id}), skipping give update"
                    )
                    return

                now = datetime.now(timezone.utc).isoformat()
                result = self.db.table("Characters").update({
                    "userId": to_user_id,
                    "claimedAt": now,
                }).eq("name", character_name).execute()

                count = len(result.data) if result.data else 0
                if count > 0:
                    logger.info(f"{LOG_EMOJIS['success']} {LOG_MESSAGES.give.completed(character_name, to_username)}")
                else:
                    logger.warning(f"{LOG_EMOJIS['warning']} {LOG_MESSAGES.give.not_found(character_name)}")
                return
            except Exception as e:
                logger.error(f"{LOG_EMOJIS['error']} {LOG_MESSAGES.error.generic('handling give')}: {e}")
                return
