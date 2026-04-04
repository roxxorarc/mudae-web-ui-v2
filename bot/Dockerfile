FROM python:3.13-slim AS builder

WORKDIR /build
COPY requirements.txt .

RUN pip wheel --no-cache-dir --wheel-dir /build/wheels -r requirements.txt

FROM python:3.13-slim AS test

WORKDIR /app

COPY --from=builder /build/wheels /wheels
RUN pip install --no-cache-dir /wheels/* pytest pytest-asyncio && rm -rf /wheels

COPY bot/pytest.ini .
COPY bot/ ./bot/
COPY db/ ./db/

RUN python -m pytest bot/tests/

FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY --from=builder /build/wheels /wheels
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels

COPY --from=test /app/bot/ ./bot/
COPY --from=test /app/db/ ./db/

RUN useradd -m appuser && chown -R appuser /app
USER appuser

CMD ["python", "-m", "bot.main"]
