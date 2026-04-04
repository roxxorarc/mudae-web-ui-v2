import logging

import discord
from discord.ext import commands
from discord import app_commands

from bot.utils.session_manager import active_sessions, Session

logger = logging.getLogger("MudaeBot")


class RegisterCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="register", description="Start recording your Mudae characters")
    async def register(self, interaction: discord.Interaction):
        try:
            user_id = str(interaction.user.id)

            if user_id in active_sessions:
                await interaction.response.send_message(
                    "Session already running, use /stop_register to stop it",
                    ephemeral=True,
                )
                return

            active_sessions[user_id] = Session(
                user_id=user_id,
                channel_id=str(interaction.channel_id),
            )

            await interaction.response.send_message(
                "Register started, send $mmi in the Mudae channel and navigate between your characters with the \u2b05\ufe0f\u27a1\ufe0f buttons.",
                ephemeral=True,
            )
        except Exception as e:
            logger.error(f"Error in register command: {e}")
            await interaction.response.send_message(
                "An error occurred while starting the register.",
                ephemeral=True,
            )


async def setup(bot: commands.Bot):
    await bot.add_cog(RegisterCommand(bot))
