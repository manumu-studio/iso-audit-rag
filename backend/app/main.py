# FastAPI application factory: lifespan, CORS, and mounted HTTP routes.
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import db
from app.config import settings
from app.routes import router


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # pytest sets ISO_AUDIT_TESTING so CI can run without Postgres.
    if os.environ.get("ISO_AUDIT_TESTING") == "1":
        yield
    else:
        await db.init_pool(settings.database_url)
        await db.create_schema(db.get_pool())
        try:
            yield
        finally:
            await db.close_pool()


app = FastAPI(
    title="iso-audit-rag",
    version="0.8.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://iso-audit.manumustudio.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
