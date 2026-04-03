import discord
from discord.ext import commands
import os
import asyncio
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mudae-bot")

intents = discord.Intents.default()
intents.message_content = True
intents.messages = True
intents.guilds = True

bot = commands.Bot(command_prefix="/", intents=intents, help_command=None)

@bot.event
async def on_ready():
    logger.info(f"Logged in as {bot.user.name} ({bot.user.id})")
    try:
        synced = await bot.tree.sync()
        logger.info(f"Synced {len(synced)} command(s).")
    except Exception as e:
        logger.error(f"Failed to sync commands: {e}")

@bot.tree.command(name="ping", description="Ping the bot to check latency")
async def ping(interaction: discord.Interaction):
    await interaction.response.send_message(f"Pong! ({round(bot.latency * 1000)}ms)", ephemeral=True)

async def load_extensions():
    # Boilerplate loading of extensions
    await bot.load_extension("bot.handlers.mudae_events")

async def main():
    async with bot:
        await load_extensions()
        token = os.getenv("DISCORD_TOKEN")
        if token:
            try:
                await bot.start(token)
            except discord.errors.HTTPException as e:
                logger.error(f"Failed to connect to Discord: 401 Unauthorized => Your token is likely invalid or revoked! Please check your .env file. Details: {e}")
            except Exception as e:
                logger.error(f"Error starting the bot: {e}")
        else:
            logger.error("No DISCORD_TOKEN found in your environment.")

if __name__ == "__main__":
    asyncio.run(main())
