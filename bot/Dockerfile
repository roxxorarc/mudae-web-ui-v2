FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Bot and DB shared module
COPY bot/ ./bot/
COPY db/ ./db/

# Start the bot
CMD ["python", "-m", "bot.main"]
