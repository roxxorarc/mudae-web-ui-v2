# Mudae Web UI (v2)

A web interface and complementary Discord bot for organizing, claiming, and trading Mudae characters.

This is a complete rewrite of a previous version I made last year completely in TypeScript for my friends group. This new version is designed to be more robust and "editable" 

No intermediate API is required since the frontend communicates directly with the Supabase database and the bot automatically synchronizes Mudae activities into the database.

I used Supabase for its integration of Discord auth and database but I plan to make a version that can be self-hosted without Supabase in the future, which is why I have added the api/ and db/ folders.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed and set up:
- **Docker** & **Docker Compose**
- A [Supabase](https://supabase.com/) account
- A [Discord Developer](https://discord.com/developers/applications) account

---

## 🛠️ Step 1: Supabase Setup

### 1. Create a Project
1. Go to the [Supabase Dashboard](https://app.supabase.com/) and create a new project.
2. In your Project Settings -> **API**, locate your **Project URL**, **anon public key**, and **service_role key**.
3. In Project Settings -> **Database**, locate your connection string (URI).

### 2. Execute Database Migrations
Go to the **SQL Editor** in your Supabase dashboard and run the SQL files located in `db/migrations/` in sequential order:
1. `001_initial_schema.sql` — Creates `user_profiles`, `Characters`, `Wishlist` tables and indexes, and allows bot-created profiles for Discord users who never authenticated.
2. `002_auth_trigger.sql` — Creates the trigger to auto-create user profiles on Discord OAuth login or bot claim.
3. `003_character_images_cache.sql` — Creates the `character_images_cache` table used by the edge function to cache scraped image lists from mudae.net (7-day TTL, avoids redundant fetches).

### 3. Deploy Edge Functions
The frontend uses a Supabase Edge Function to scrape character image galleries from mudae.net server-side (bypassing hotlink protection) and cache results in the database, you can either use Supabase CLI or the dashboard to deploy it.

1. Using the CLI
Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and link your project:
```bash
npm install -g supabase
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
```

Deploy the function:
```bash
supabase functions deploy get-character-images
```

2. Using the Dashboard
- Go to **Functions** in the Supabase dashboard.
- Click **New Function** and name it `get-character-images`.
- Paste the code from `api/get-character-images/index.ts` into the function editor.

> **Note:** The function requires `verify_jwt = true` (already set in `supabase/config.toml`), so only authenticated users can call it. The Supabase client in the frontend automatically attaches the user's session JWT — no extra configuration needed.

### 4. Set Up Discord Authentication
1. Go to **Authentication** > **Providers** in Supabase.
2. Enable **Discord**.
3. You will need your Discord **Client ID** and **Client Secret** (from Step 2).
4. Copy the **Redirect URI** provided by Supabase (e.g., `https://<YOUR_REF>.supabase.co/auth/v1/callback`).
5. Paste this Redirect URI into the Discord Developer Portal (Step 2) when setting up your OAuth2 credentials.
6. Go to Supabase **Authentication** > **Settings** and set the "Site URL" to your frontend URL (e.g., `http://localhost:5175` for local development).

---

## 🤖 Step 2: Discord Bot Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a **New Application**.
3. Navigate to **OAuth2 > General** and paste the **Supabase Redirect URI** you copied earlier into the *Redirects* section.
4. Copy the **Client ID** and **Client Secret** and put them into your Supabase Discord Provider settings.
5. Navigate to the **Bot** tab.
6. Click **Reset Token** to generate a new bot token and save it securely.
7. **Crucial:** Enable the **Message Content Intent** and **Server Members Intent** under the Privileged Gateway Intents section.
8. Go to **OAuth2 > URL Generator**, select the `bot` scope, give it `Read Messages`, `Send Messages`, and `Embed Links` permissions, and invite the bot to your server.
9. Obtain the **Channel IDs** of the channels where Mudae rolls happen.

---

## ⚙️ Step 3: Environment Variables

Rename `.env.example` to `.env` in the root of your project and fill in the values:

```env
# === DATABASE ===
# Your Supabase Postgres connection string (Usually starts with postgresql://)
DATABASE_URL="postgresql://postgres.[YOUR_REF]:[YOUR_PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# === SUPABASE ===
# Found in Supabase Settings -> API
SUPABASE_URL="https://[YOUR_REF].supabase.co"
SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# === DISCORD BOT ===
# Found in the Discord Developer Portal
DISCORD_CLIENT_ID="your_client_id"
DISCORD_TOKEN="your_bot_token"
# Comma-separated list of channel IDs where the bot should listen to Mudae
CHANNEL_IDS="11111111111111,22222222222222"
```

---

## 🚀 Step 4: Running the Project

Since the project uses Docker, starting the entire stack is straightforward. Open a terminal in the root directory and run:

```bash
docker-compose up --build -d
```

This will:
1. Build and start the **Discord Bot** (`bot/`).
2. Build and serve the **Frontend** (`frontend/`) efficiently securely passing the Supabase environment variables into the Vite build step.

### Viewing Logs
To see the bot reading messages for Mudae rolls and character claims:
```bash
docker-compose logs -f bot
```

To see the frontend logs:
```bash
docker-compose logs -f frontend
```

---

## 📜 Architecture & Automation Notes

- **Users:** When a user interacts with the Mudae bot (marries/claims) or logs into the web UI via Discord OAuth, their profile is securely upserted into the PostgreSQL `user_profiles` table using Supabase triggers. No manual sign-up is required.
- **Constraints:** The bot pre-ensures profile existence (`ensure_user_profile`) before writing ownership to `Characters.userId`, and the base schema allows placeholder `user_profiles` rows for non-authenticated Discord members.
- **Edge Function Caching:** The `get-character-images` edge function caches scraped image lists for each character in the `character_images_cache` table with a 7-day TTL, minimizing redundant scraping of mudae.net and improving frontend performance.

- **Kakera fill script** Script to backfill kakera values for characters with kakeraValue = 0

