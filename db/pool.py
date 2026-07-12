import os

from dotenv import load_dotenv
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL must be set in environment variables")

_pool = AsyncConnectionPool(
    DATABASE_URL,
    open=False,
    kwargs={"row_factory": dict_row},
)


def get_pool() -> AsyncConnectionPool:
    return _pool


async def open_pool() -> None:
    await _pool.open()
    await _pool.wait()


async def close_pool() -> None:
    await _pool.close()
