from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./isert.db"   # default SQLite; swap for postgres://...

    # App
    app_name: str = "QuickPoint"
    debug: bool = True

    # Whisper
    whisper_model_size: str = "base"   # tiny | base | small | medium | large

    # HuggingFace
    summarization_model: str = "facebook/bart-large-cnn"
    sentiment_model: str = "distilbert-base-uncased-finetuned-sst-2-english"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
