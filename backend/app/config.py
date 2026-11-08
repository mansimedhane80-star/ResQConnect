
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


BACKEND_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
DEFAULT_ADMIN_DOCUMENTS_DIR = Path(__file__).resolve().parents[1] / ".private_documents"


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    ADMIN_DOCUMENTS_DIR: str = str(DEFAULT_ADMIN_DOCUMENTS_DIR)

    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM_EMAIL: str | None = None
    SMTP_USE_TLS: bool = True

    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_FROM_NUMBER: str | None = None

    PUBLIC_WEB_URL: str = "http://localhost:5173"

    REVERSE_GEOCODER_URL: str | None = None
    GEOCODER_USER_AGENT: str = "ResQConnect/1.0"

    # NuGen AI configuration
    NUGEN_API_KEY: str | None = None
    NUGEN_BASE_URL: str = "https://api.nugen.in/api/v3"
    NUGEN_MODEL: str = "model_01m6wq1mfwj2vp0d"

    model_config = SettingsConfigDict(
        env_file=BACKEND_ENV_FILE,
        extra="ignore"
    )


settings = Settings()
