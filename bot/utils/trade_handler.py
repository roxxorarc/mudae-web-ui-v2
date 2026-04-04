import re
import logging
from datetime import datetime, timezone

import discord

from bot.utils.mudae_event_handler import MudaeEventHandler, EventConfig
from bot.utils.patterns import TRADE_PATTERN
from bot.config.constants import LOG_EMOJIS, LOG_MESSAGES

logger = logging.getLogger("MudaeBot")


class TradeHandler(MudaeEventHandler):
    def __init__(self, config: EventConfig):
        super().__init__(config)

    async def handle(self, message: discord.Message) -> None:
        logger.debug(f"[TRADE HANDLER] Processing message with {len(self.extract_text_sources(message))} text sources")
        sources = self.extract_text_sources(message)

        for text in sources:
            match = TRADE_PATTERN.search(text)
            if not match:
                logger.debug(f"[TRADE HANDLER] No match in text: {text[:100]}")
                continue
            logger.debug(f"[TRADE HANDLER] Trade pattern matched!")

            left_chars = self._parse_character_names(match.group(1))
            right_chars = self._parse_character_names(match.group(2))

            if not left_chars or not right_chars:
                continue

            try:
                success = await self._process_trade_swap(left_chars, right_chars, message)
                if success:
                    return
            except Exception as e:
                logger.error(f"Error processing trade: {e}")

    def _parse_character_names(self, text: str) -> list[str]:
        text = text.replace("**", "")
        parts = re.split(r'(?:,\s*|\s+et\s+)', text, flags=re.IGNORECASE)
        return [self.clean_name(s) for s in parts if self.clean_name(s)]

    async def _process_trade_swap(
        self,
        left_chars: list[str],
        right_chars: list[str],
        message: discord.Message,
    ) -> bool:
        left_result = self.db.table("Characters").select("name, userId").in_("name", left_chars).execute()
        right_result = self.db.table("Characters").select("name, userId").in_("name", right_chars).execute()

        left_db_chars = left_result.data or []
        right_db_chars = right_result.data or []

        if not left_db_chars or not right_db_chars:
            return False

        left_owners = list({c["userId"] for c in left_db_chars if c.get("userId")})
        right_owners = list({c["userId"] for c in right_db_chars if c.get("userId")})

        if len(left_owners) != 1 or len(right_owners) != 1:
            return False

        left_owner_id = left_owners[0]
        right_owner_id = right_owners[0]

        left_user = left_owner_id
        right_user = right_owner_id
        if message.guild:
            member = message.guild.get_member(int(left_owner_id))
            if member:
                left_user = member.name
            member = message.guild.get_member(int(right_owner_id))
            if member:
                right_user = member.name

        left_char_names = [c["name"] for c in left_db_chars]
        right_char_names = [c["name"] for c in right_db_chars]

        logger.info(f"{LOG_EMOJIS['trade']} {LOG_MESSAGES.trade.detected(left_user, left_char_names, right_user, right_char_names)}")

        now = datetime.now(timezone.utc).isoformat()

        # Swap owners (sequential - supabase doesn't support transactions via client)
        self.db.table("Characters").update({
            "userId": right_owner_id,
            "claimedAt": now,
        }).in_("name", left_char_names).execute()

        self.db.table("Characters").update({
            "userId": left_owner_id,
            "claimedAt": now,
        }).in_("name", right_char_names).execute()

        logger.info(f"{LOG_EMOJIS['success']} {LOG_MESSAGES.trade.completed(left_char_names, right_char_names)}")
        return True
