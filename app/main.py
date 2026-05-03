# FastAPI application factory: lifespan, CORS, health check, and API routes.
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app import db
from app.config import settings
from app.routes import router as api_router


class HealthResponse(BaseModel):
    """Response body for `GET /health`."""

    status: str


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    await db.init_pool(settings.database_url)
    await db.create_schema(db.get_pool())
    try:
        yield
    finally:
        await db.close_pool()


app = FastAPI(
    title="iso-audit-rag",
    version="0.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Liveness probe used by tests, Docker healthchecks, and CI smoke tests."""
    return HealthResponse(status="ok")
