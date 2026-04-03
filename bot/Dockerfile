FROM python:3.11-slim AS builder

WORKDIR /build
COPY requirements.txt .

RUN pip wheel --no-cache-dir --wheel-dir /build/wheels -r requirements.txt

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY --from=builder /build/wheels /wheels
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels

COPY bot/ ./bot/
COPY db/ ./db/

RUN useradd -m appuser && chown -R appuser /app
USER appuser

CMD ["python", "-m", "bot.main"]
