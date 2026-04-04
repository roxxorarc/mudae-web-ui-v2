import discord
from discord.ext import commands
import os
import asyncio
from dotenv import load_dotenv, main
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
    logger.info(f"🤖 Logged in as {bot.user.name} ({bot.user.id})")
    try:
        synced = await bot.tree.sync()
        logger.info(f"✅ Synced {len(synced)} command(s).")
    except Exception as e:
        logger.error(f"❌ Failed to sync commands: {e}")

async def load_extensions():
    logger.info("Loading extensions...")
    await bot.load_extension("bot.cogs.core")
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
