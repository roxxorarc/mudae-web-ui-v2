from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import characters, users, wishlist
from api.settings import FRONTEND_ORIGIN
from db.pool import close_pool, open_pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    await open_pool()
    yield
    await close_pool()


app = FastAPI(
    title="Mudae Web UI API",
    version="1.0.0",
    description="API for Mudae Web UI",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(characters.router)
app.include_router(users.router)
app.include_router(wishlist.router)


@app.get("/")
async def root():
    return {"message": "Mudae Web UI API", "status": "running"}


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
