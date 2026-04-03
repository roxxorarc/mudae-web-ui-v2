from fastapi import FastAPI, Depends, WebSocket
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_db
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Mudae Web UI API",
    version="0.1.0",
    description="API for Mudae Web UI"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO - Restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint - API status"""
    return {
        "message": "Mudae Web UI API",
        "version": "0.1.0",
        "status": "running"
    }

@app.get("/api")
async def api_root():
    """API root endpoint"""
    return {
        "message": "Mudae Web UI API",
        "endpoints": {
            "health": "/api/health",
            "root": "/"
        }
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}