import discord
from discord.ext import commands
from discord import app_commands
import logging

class CoreCommands(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.logger = logging.getLogger("MudaeBot")

    @app_commands.command(name="ping", description="Check bot latency")
    async def ping_command(self, interaction: discord.Interaction):
        latency = round(self.bot.latency * 1000)
        self.logger.info(f"Ping command executed by {interaction.user.name} ({latency}ms)")
        await interaction.response.send_message(f"Pong! Latency is {latency}ms")

async def setup(bot: commands.Bot):
    await bot.add_cog(CoreCommands(bot))