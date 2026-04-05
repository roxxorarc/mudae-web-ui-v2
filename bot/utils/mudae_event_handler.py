from abc import ABC, abstractmethod
import re
import logging
import uuid

import discord

from bot.utils.patterns import MUDAE_BOT_ID
from db.database import supabase

logger = logging.getLogger("MudaeBot")


def ensure_user_profile(user_id: str, username: str | None = None) -> bool:
    if not user_id:
        return False

    try:
        res = supabase.table("user_profiles").select("discordId").eq("discordId", user_id).maybe_single().execute()
        existing = getattr(res, "data", None) if res else None
        if existing:
            return True

        supabase.table("user_profiles").insert({
            "id": str(uuid.uuid4()),
            "discordId": user_id,
            "discordUsername": username or "Unknown"
        }).execute()
        logger.info(f"Created new user profile for {username} ({user_id})")
        return True
    except Exception as e:
        logger.warning(f"Failed to ensure user_profile for {user_id}: {e}")
        return False


class EventConfig:
    def __init__(self, channel_ids: list[str]):
        self.channel_ids = channel_ids


class MudaeEventHandler(ABC):
    def __init__(self, config: EventConfig):
        self.config = config

    async def process(self, message: discord.Message) -> None:
        handler_name = self.__class__.__name__
        if str(message.channel.id) not in self.config.channel_ids:
            logger.debug(f"[{handler_name}] Message in unconfigured channel: {message.channel.id}")
            return

        logger.debug(f"[{handler_name}] Processing message in configured channel")
        valid_message = await self._validate_and_fetch_message(message)
        if not valid_message:
            logger.debug(f"[{handler_name}] Message validation failed")
            return

        logger.debug(f"[{handler_name}] Message validated, calling handler")
        await self.handle(valid_message)

    @abstractmethod
    async def handle(self, message: discord.Message) -> None:
        ...

    async def _validate_and_fetch_message(self, message: discord.Message) -> discord.Message | None:
        if message.author.id != MUDAE_BOT_ID:
            return None

        return message

    def extract_text_sources(self, message: discord.Message) -> list[str]:
        sources = []
        if message.content:
            sources.append(message.content)
        if message.embeds:
            embed = message.embeds[0]
            if embed.description:
                sources.append(embed.description)
            if embed.title:
                sources.append(embed.title)
        return sources

    def clean_name(self, name: str) -> str:
        name = name.strip()
        name = name.replace("**", "")
        # Allow leading '.' in usernames, only strip other leading punctuation
        name = re.sub(r'^[^\w\s.]+', '', name)
        return name.strip()

    def find_member_by_name(self, guild: discord.Guild, username: str) -> str | None:
        clean_username = username.lower()
        for member in guild.members:
            if (member.name.lower() == clean_username
                    or member.display_name.lower() == clean_username
                    or (member.global_name and member.global_name.lower() == clean_username)):
                return str(member.id)
            
        return None

    @property
    def db(self):
        return supabase
