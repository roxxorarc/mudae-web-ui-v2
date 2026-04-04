import logging

import discord
from discord.ext import commands
from discord import app_commands

from bot.utils.session_manager import active_sessions

logger = logging.getLogger("MudaeBot")


class StopRegisterCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="stop_register", description="Stop recording your Mudae characters")
    async def stop_register(self, interaction: discord.Interaction):
        try:
            user_id = str(interaction.user.id)
            session = active_sessions.get(user_id)

            if not session:
                await interaction.response.send_message(
                    "Aucune session d'enregistrement en cours.",
                    ephemeral=True,
                )
                return

            count = session.characters_count
            del active_sessions[user_id]

            plural = "s" if count != 1 else ""
            await interaction.response.send_message(
                f"Session arr\u00eat\u00e9e. {count} personnage{plural} enregistr\u00e9{plural}.",
                ephemeral=True,
            )
        except Exception as e:
            logger.error(f"Error in stop_register command: {e}")
            await interaction.response.send_message(
                "Une erreur est survenue.",
                ephemeral=True,
            )


async def setup(bot: commands.Bot):
    await bot.add_cog(StopRegisterCommand(bot))
