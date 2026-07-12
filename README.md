# Mudae Web UI (v2)

This is a complete rewrite of a previous version I made last year completely in TypeScript for my friends group. This new version is designed to be more robust and "editable"

The stack is fully self-hosted: a Postgres database, a FastAPI backend (REST API + Discord OAuth login + image scraping), a React frontend, and a Discord bot that automatically synchronizes Mudae activities into the database. No third-party backend service is required.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed and set up:
- **Docker** & **Docker Compose**
- A [Discord Developer](https://discord.com/developers/applications) account

---

## 🤖 Step 1: Discord Application Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a **New Application**.
3. Navigate to **OAuth2 > General**:
   - Copy the **Client ID** and **Client Secret** (used for web login).
   - Add the redirect URI: `<PUBLIC_API_URL>/api/auth/callback` (e.g. `http://localhost:8000/api/auth/callback` for local use). It must match your `.env` value **exactly**.
4. Navigate to the **Bot** tab.
5. Click **Reset Token** to generate a new bot token and save it securely.
6. **Crucial:** Enable the **Message Content Intent** and **Server Members Intent** under the Privileged Gateway Intents section.
7. Go to **OAuth2 > URL Generator**, select the `bot` scope, give it `Read Messages`, `Send Messages`, and `Embed Links` permissions, and invite the bot to your server.
8. Obtain the **Channel IDs** of the channels where Mudae rolls happen.

---

## ⚙️ Step 2: Environment Variables

Copy `.env.example` to `.env` in the root of your project and fill in the values:

```env
# === DATABASE ===
POSTGRES_USER="mudae"
POSTGRES_PASSWORD="pick_a_password"
POSTGRES_DB="mudae"
DATABASE_URL="postgresql://mudae:pick_a_password@postgres:5432/mudae"

# === DISCORD BOT ===
DISCORD_TOKEN="your_bot_token"
CHANNEL_IDS="11111111111111,22222222222222"

# === DISCORD OAUTH (same application as the bot) ===
DISCORD_CLIENT_ID="your_app_client_id"
DISCORD_CLIENT_SECRET="your_app_client_secret"

# === API / SESSION ===
SESSION_SECRET="output of `openssl rand -hex 32`"
PUBLIC_API_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:5175"
COOKIE_SECURE="false"
```

Notes:
- `DATABASE_URL` uses host `postgres` inside docker compose; use `localhost` if you run the bot/API outside Docker.
- Set `COOKIE_SECURE="true"` when serving over HTTPS.
- If the frontend and API are served from different domains in production, put them behind a single reverse proxy (same origin) so the session cookie works.

---

## 🚀 Step 3: Running the Project

Open a terminal in the root directory and run:

```bash
docker compose up --build -d
```

This will:
1. Start **Postgres** and initialize the schema from `db/migrations/` (first boot only).
2. Build and start the **API** (`api/`) on port 8000 — REST endpoints, Discord OAuth login, and the mudae.net image gallery scraper (cached 7 days in `character_images_cache`).
3. Build and start the **Discord Bot** (`bot/`) — the bot test suite runs during the image build.
4. Build and serve the **Frontend** (`frontend/`) on port 5175.

### Viewing Logs
```bash
docker compose logs -f discord-bot
docker compose logs -f backend-api
docker compose logs -f frontend-web
```

### Local Development (without Docker)

```bash
# Postgres only
docker compose up -d postgres

# API
pip install -r requirements.txt
DATABASE_URL="postgresql://mudae:pick_a_password@localhost:5432/mudae" uvicorn api.main:app --port 8000

# Frontend (vite dev server proxies /api to localhost:8000)
cd frontend && pnpm install && pnpm dev

# Bot tests
python -m pytest bot/tests/ -c bot/pytest.ini
```

---

## 📜 Architecture & Automation Notes

- **Users:** When a user interacts with the Mudae bot (marries/claims), the bot pre-ensures profile existence (`ensure_user_profile`) before writing ownership to `Characters.userId`. When a user logs into the web UI via Discord OAuth, their profile is upserted by the API at the OAuth callback. No manual sign-up is required.
- **Auth:** The API implements the Discord OAuth2 code flow itself (scope `identify`) and issues a signed JWT in an HttpOnly cookie (7-day expiry). Wishlist mutations and character reordering require a session and are scoped server-side to the logged-in user.
- **Data layer:** Both the API and the bot share the async psycopg data layer in `db/repository.py`. Trades swap owners inside a single transaction.
- **Image caching:** `GET /api/characters/{id}/images` scrapes mudae.net server-side (bypassing hotlink protection) and caches image lists per character in `character_images_cache` with a 7-day TTL.
- **Kakera fill script:** `python -m bot.scripts.fill_kakera` backfills kakera values for characters with `kakeraValue = 0`.
