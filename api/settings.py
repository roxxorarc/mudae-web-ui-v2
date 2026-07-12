import os

from dotenv import load_dotenv

load_dotenv()

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5175")

# Discord OAuth (same application as the bot)
DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID", "")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET", "")

# Public base URL of this API, used to build the OAuth redirect_uri —
# must match the redirect registered in the Discord developer portal.
PUBLIC_API_URL = os.getenv("PUBLIC_API_URL", "http://localhost:8000")
# Where to send the browser after a successful login
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5175")

SESSION_SECRET = os.getenv("SESSION_SECRET", "")
SESSION_COOKIE = "mudae_session"
SESSION_MAX_AGE = 7 * 24 * 60 * 60  # 7 days
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
