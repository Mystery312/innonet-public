from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
from urllib.parse import quote_plus


class Settings(BaseSettings):
    # Application
    app_name: str = "Innonet API"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    environment: str = "development"  # development, staging, production

    # Database - supports both connection string and individual variables
    database_url: Optional[str] = None
    db_host: str = "postgres"
    db_port: int = 5432
    db_name: str = "innonet"
    db_user: str = "postgres"
    db_password: str = ""
    db_driver: str = "postgresql+asyncpg"

    # Redis - supports both connection string and individual variables
    redis_url: Optional[str] = None
    redis_host: str = "redis"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str = ""

    # Database Pool Settings
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_pre_ping: bool = True

    # Authentication
    secret_key: str  # REQUIRED - No default for security
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # Data Encryption at Rest
    encryption_key: Optional[str] = None  # Fernet key for field-level encryption

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_publishable_key: str = ""

    # SendGrid
    sendgrid_api_key: str = ""
    sendgrid_from_email: str = "noreply@innonet.com"

    # OpenAI (for AI features)
    openai_api_key: str = ""
    openai_embedding_model: str = "text-embedding-3-small"
    openai_chat_model: str = "gpt-4-turbo-preview"

    # Neo4j (for graph networking)
    neo4j_uri: str = "bolt://neo4j:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str  # REQUIRED - No default for security

    # Frontend URL (for CORS and redirects)
    frontend_url: str = "http://localhost:5173"

    # Monitoring
    sentry_dsn: Optional[str] = None
    sentry_traces_sample_rate: float = 0.1

    # Rate Limiting
    rate_limit_default: str = "100/minute"
    rate_limit_auth: str = "10/minute"
    rate_limit_ai: str = "20/minute"

    class Config:
        env_file = ".env"
        case_sensitive = False

    def get_database_url(self) -> str:
        """
        Get database connection URL.

        Prefers DATABASE_URL if set, otherwise constructs from individual variables.
        This allows for secure credential management via secret services.
        """
        if self.database_url:
            return self.database_url

        # Build URL from individual components
        password = quote_plus(self.db_password) if self.db_password else ""
        auth = f"{self.db_user}:{password}" if password else self.db_user

        return f"{self.db_driver}://{auth}@{self.db_host}:{self.db_port}/{self.db_name}"

    def get_redis_url(self) -> str:
        """
        Get Redis connection URL.

        Prefers REDIS_URL if set, otherwise constructs from individual variables.
        """
        if self.redis_url:
            return self.redis_url

        # Build URL from individual components
        auth = f":{quote_plus(self.redis_password)}@" if self.redis_password else ""
        return f"redis://{auth}{self.redis_host}:{self.redis_port}/{self.redis_db}"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    @property
    def cors_origins(self) -> list[str]:
        """Get CORS origins based on environment."""
        if self.is_production:
            # Production: only allow the configured frontend URL
            origins = [self.frontend_url]
            # Also allow www subdomain if applicable
            if self.frontend_url.startswith("https://app."):
                base_domain = self.frontend_url.replace("https://app.", "https://")
                origins.append(base_domain)
                origins.append(base_domain.replace("https://", "https://www."))
            return origins
        else:
            # Development/staging: allow localhost ports
            return list(set([
                self.frontend_url,
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175",
                "http://127.0.0.1:5173",
            ]))


@lru_cache()
def get_settings() -> Settings:
    return Settings()
