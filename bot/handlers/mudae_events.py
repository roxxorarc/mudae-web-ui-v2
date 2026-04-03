import discord
from discord.ext import commands
import logging
from db.database import AsyncSessionLocal
from db.models import User, Character

logger = logging.getLogger("mudae-bot")

class MudaeEventHandler(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        """Skeleton for passive event listening. To be developed."""
        if message.author.bot:
            return

async def setup(bot):
    await bot.add_cog(MudaeEventHandler(bot))
