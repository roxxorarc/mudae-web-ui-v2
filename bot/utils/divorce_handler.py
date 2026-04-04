import re
import logging

import discord

from bot.utils.mudae_event_handler import MudaeEventHandler, EventConfig
from bot.utils.patterns import DIVORCE_PATTERN
from bot.config.constants import LOG_EMOJIS, LOG_MESSAGES

logger = logging.getLogger("MudaeBot")


class DivorceHandler(MudaeEventHandler):
    def __init__(self, config: EventConfig):
        super().__init__(config)

    async def handle(self, message: discord.Message) -> None:
        logger.debug(f"[DIVORCE HANDLER] Processing message with {len(self.extract_text_sources(message))} text sources")
        sources = self.extract_text_sources(message)
        username: str | None = None
        character_names: list[str] = []

        for text in sources:
            match = DIVORCE_PATTERN.search(text)
            if not match:
                logger.debug(f"[DIVORCE HANDLER] No match in text: {text[:100]}")
                continue
            logger.debug(f"[DIVORCE HANDLER] Divorce pattern matched!")

            # Parse "**Char1**, **Char2** et **username**"
            raw_text = match.group(1).replace("**", "").strip()
            parts = re.split(r'\s+(?:et|and)\s+', raw_text, flags=re.IGNORECASE)

            if len(parts) < 2:
                continue

            # Last element = user, rest = characters
            potential_user = self.clean_name(parts[-1])
            characters_text = ", ".join(parts[:-1])
            potential_characters = [
                self.clean_name(s)
                for s in characters_text.split(",")
                if self.clean_name(s)
            ]

            member_id = self.find_member_by_name(message.guild, potential_user)
            if member_id and potential_characters:
                username = potential_user
                character_names = potential_characters
                break

        if not username or not character_names:
            return

        user_id = self.find_member_by_name(message.guild, username)
        if not user_id:
            return

        try:
            logger.info(f"{LOG_EMOJIS['divorce']} {LOG_MESSAGES.divorce.detected(username, character_names)}")

            result = self.db.table("Characters").update({
                "userId": None,
                "claimedAt": None,
            }).eq("userId", user_id).in_("name", character_names).execute()

            count = len(result.data) if result.data else 0
            if count > 0:
                logger.info(f"{LOG_EMOJIS['success']} {LOG_MESSAGES.divorce.updated(count, username)}")
        except Exception as e:
            logger.error(f"{LOG_EMOJIS['error']} {LOG_MESSAGES.error.generic('handling divorced characters')}: {e}")
