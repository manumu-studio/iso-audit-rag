# Pydantic Settings: type-safe loading of environment variables from .env.
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables / `.env`.

    All secrets default to empty strings so local boot and the `/health`
    endpoint work without any credentials configured. Later packets that
    actually call OpenAI / Anthropic / Postgres will fail loudly if their
    respective values are still blank.
    """

    database_url: str = "postgresql://postgres:postgres@localhost:5432/iso_audit"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    environment: Literal["dev", "prod"] = "dev"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
