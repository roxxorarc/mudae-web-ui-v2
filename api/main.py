from fastapi import FastAPI, Depends, WebSocket
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_db
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Mudae Web UI API")

@app.get("/api/health")
async def health_check():
    """Boilerplate health check endpoint"""
    return {"status": "ok"}