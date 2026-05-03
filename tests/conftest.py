# Shared pytest fixtures: in-process async HTTP client against the FastAPI app.
from collections.abc import AsyncIterator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest_asyncio.fixture
async def async_client() -> AsyncIterator[AsyncClient]:
    """Yield an `httpx.AsyncClient` wired to the FastAPI app via ASGI transport.

    Function-scoped so each test gets a fresh client. No real network is
    used — requests are dispatched in-process through `ASGITransport`.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
