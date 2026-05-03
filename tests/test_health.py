# Smoke test for the `/health` liveness endpoint.
from httpx import AsyncClient


async def test_health_returns_ok(async_client: AsyncClient) -> None:
    """`GET /health` must return 200 and `{"status": "ok"}`."""
    response = await async_client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
