import os
import asyncio

import discord
from discord.ext import commands
from dotenv import load_dotenv

from bot.utils.logger import setup_logger

load_dotenv()

logger = setup_logger()

intents = discord.Intents.default()
intents.message_content = True
intents.messages = True
intents.guilds = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents, help_command=None)


@bot.event
async def on_ready():
    logger.info(f"Logged in as {bot.user.name} ({bot.user.id})")
    try:
        synced = await bot.tree.sync()
        logger.info(f"Synced {len(synced)} command(s).")
    except Exception as e:
        logger.error(f"Failed to sync commands: {e}")


EXTENSIONS = [
    "bot.cogs.core",
    "bot.cogs.mudae_events",
    "bot.commands.register",
    "bot.commands.stop_register",
]


async def main():
    logger.info("Loading extensions...")
    for ext in EXTENSIONS:
        try:
            await bot.load_extension(ext)
            logger.info(f"Loaded: {ext}")
        except Exception as e:
            logger.error(f"Failed to load {ext}: {e}")

    token = os.getenv("DISCORD_TOKEN")
    if not token:
        logger.error("No DISCORD_TOKEN found in your environment.")
        return

    try:
        await bot.start(token)
    except discord.errors.HTTPException as e:
        logger.error(f"Failed to connect to Discord: {e}")
    except Exception as e:
        logger.error(f"Error starting the bot: {e}")


if __name__ == "__main__":
    asyncio.run(main())
