# Pydantic schemas for the `/ask` endpoint and shared API response types.
from pydantic import BaseModel, ConfigDict, Field


class AskRequest(BaseModel):
    """Inbound body for `POST /ask`."""

    model_config = ConfigDict(frozen=True)

    question: str = Field(min_length=1, max_length=1000)


class Citation(BaseModel):
    """A control (or excerpt) cited in the generated answer."""

    model_config = ConfigDict(frozen=True)

    control_id: str
    title: str
    family: str
    relevance_score: float


class MetaInfo(BaseModel):
    """Diagnostics and provenance for an `/ask` response."""

    model_config = ConfigDict(frozen=True)

    model: str
    search_method: str
    latency_ms: int
    controls_searched: int


class AskResponse(BaseModel):
    """Structured compliance answer with citations and timing metadata."""

    model_config = ConfigDict(frozen=True)

    answer: str
    citations: list[Citation]
    meta: MetaInfo
