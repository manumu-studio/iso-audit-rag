# Pydantic Settings: type-safe loading of environment variables from .env.
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables / .env."""

    database_url: str = "postgresql://postgres:postgres@localhost:5432/iso_audit"
    max_upload_size_mb: int = 20
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    search_top_k: int = 10
    rrf_k: int = 60
    environment: Literal["dev", "prod"] = "dev"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
