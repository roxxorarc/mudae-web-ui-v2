import logging
from datetime import datetime, timezone

import discord

from bot.utils.mudae_event_handler import MudaeEventHandler, EventConfig, ensure_user_profile
from bot.utils.patterns import MARRIAGE_PATTERNS
from bot.config.constants import LOG_EMOJIS, LOG_MESSAGES

logger = logging.getLogger("MudaeBot")


class MarriageHandler(MudaeEventHandler):
    def __init__(self, config: EventConfig):
        super().__init__(config)

    async def handle(self, message: discord.Message) -> None:
        logger.debug(f"[MARRIAGE HANDLER] Processing message with {len(self.extract_text_sources(message))} text sources")
        sources = self.extract_text_sources(message)
        username: str | None = None
        character_name: str | None = None

        for text in sources:
            for pattern in MARRIAGE_PATTERNS:
                match = pattern.search(text)
                if not match:
                    continue

                name1 = self.clean_name(match.group(1))
                name2 = self.clean_name(match.group(2))

                member_id1 = self.find_member_by_name(message.guild, name1)
                member_id2 = self.find_member_by_name(message.guild, name2)

                if member_id1 and not member_id2:
                    username = name1
                    character_name = name2
                elif member_id2 and not member_id1:
                    username = name2
                    character_name = name1

                if username and character_name:
                    break
            if username and character_name:
                break

        if not username or not character_name:
            return

        user_id = self.find_member_by_name(message.guild, username)
        if not user_id:
            return

        if not ensure_user_profile(user_id, username):
            logger.warning(
                f"{LOG_EMOJIS['warning']} Could not upsert user_profile for {username} ({user_id}), skipping marriage update"
            )
            return

        try:
            logger.info(f"{LOG_EMOJIS['marriage']} {LOG_MESSAGES.marriage.detected(username, character_name)}")

            now = datetime.now(timezone.utc).isoformat()
            result = self.db.table("Characters").update({
                "userId": user_id,
                "claimedAt": now,
            }).eq("name", character_name).execute()

            count = len(result.data) if result.data else 0
            if count > 0:
                logger.info(f"{LOG_EMOJIS['success']} {LOG_MESSAGES.marriage.updated(character_name, username, count)}")
            else:
                logger.warning(f"{LOG_EMOJIS['warning']} {LOG_MESSAGES.marriage.not_found(character_name)}")
        except Exception as e:
            logger.error(f"{LOG_EMOJIS['error']} {LOG_MESSAGES.error.generic('handling marriage')}: {e}")
