import os
import logging

import discord
from discord.ext import commands

from bot.utils.mudae_event_handler import EventConfig
from bot.utils.mudae_listener import handle_mudae_message
from bot.utils.marriage_handler import MarriageHandler
from bot.utils.divorce_handler import DivorceHandler
from bot.utils.trade_handler import TradeHandler
from bot.utils.give_handler import GiveHandler
from bot.utils.changeimg_handler import handle_changeimg_command
from bot.utils.patterns import MUDAE_BOT_ID

logger = logging.getLogger("MudaeBot")


class MudaeEvents(commands.Cog):
    """Cog that dispatches Mudae bot messages to the appropriate handlers."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot

        channels_env = os.getenv("CHANNEL_IDS", os.getenv("EVENT_CHANNELS", ""))
        channel_ids = [s.strip() for s in channels_env.split(",") if s.strip()]

        logger.info(f"[MUDAE EVENTS] Loaded CHANNEL_IDS: {channel_ids}")

        config = EventConfig(channel_ids=channel_ids)

        self.marriage_handler = MarriageHandler(config)
        self.divorce_handler = DivorceHandler(config)
        self.trade_handler = TradeHandler(config)
        self.give_handler = GiveHandler(config)

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        # Handle $changeimg from any user
        if message.content.startswith("$changeimg"):
            logger.info(f"[CHANGEIMG] User {message.author.name} ({message.author.id}) sent: {message.content}")
            await handle_changeimg_command(message)
            return

        # Only process Mudae messages
        if message.author.id != MUDAE_BOT_ID:
            return

        # Log Mudae message details for debugging
        logger.debug(
            f"[MUDAE MSG] Channel: {message.channel.name if hasattr(message.channel, 'name') else message.channel.id} | "
            f"Embeds: {len(message.embeds)} | Content: {message.content[:100] or '(none)'}"
        )

        if message.embeds:
            for i, embed in enumerate(message.embeds):
                logger.debug(
                    f"[MUDAE EMBED {i}] Author: {embed.author.name if embed.author else '(none)'} | "
                    f"Title: {embed.title[:50] if embed.title else '(none)'} | "
                    f"Description: {embed.description[:100] if embed.description else '(none)'}..."
                )

        # Character detection ($mmi, $ma/$mm rolls)
        logger.debug("[MUDAE LISTENER] Processing character detection")
        try:
            await handle_mudae_message(message)
        except Exception as e:
            logger.error(f"[MUDAE LISTENER] Exception: {e}", exc_info=True)

        # Event handlers (marriage, divorce, trade, give)
        logger.debug("[MUDAE HANDLERS] Processing event handlers (marriage, divorce, trade, give)")
        for handler in (self.marriage_handler, self.divorce_handler, self.trade_handler, self.give_handler):
            try:
                await handler.process(message)
            except Exception as e:
                logger.error(f"[{handler.__class__.__name__}] Exception: {e}", exc_info=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(MudaeEvents(bot))
    logger.info("Loaded cog: MudaeEvents")
