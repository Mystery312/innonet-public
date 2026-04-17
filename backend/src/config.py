from pydantic_settings import BaseSettings
from pydantic import field_validator, model_validator
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

    # Database TLS (Alibaba RDS / production-grade Postgres)
    # Options: disable, prefer, require, verify-ca, verify-full
    db_ssl_mode: str = "prefer"
    db_ssl_root_cert: Optional[str] = None  # Path to CA bundle (e.g. Alibaba RDS CA)

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

    # Data Encryption at Rest (field-level, versioned key-ring)
    # Legacy single-key env var - used as v1 if encryption_key_v1 is not set.
    encryption_key: Optional[str] = None
    # Versioned Fernet keys. Generate with:
    #   python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    encryption_key_v1: Optional[str] = None
    encryption_key_v2: Optional[str] = None
    encryption_key_v3: Optional[str] = None
    # Active version used for new writes. Bumping this enables lazy key rotation.
    encryption_current_version: int = 1
    # HMAC key for deterministic lookup hashes on encrypted columns (e.g. email).
    # Generate with: openssl rand -hex 32
    encryption_lookup_hash_key: Optional[str] = None

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

    # ============================================================================
    # SECURITY VALIDATORS
    # ============================================================================

    @field_validator("encryption_key_v1")
    @classmethod
    def validate_encryption_key_v1(cls, v: Optional[str], info) -> Optional[str]:
        """Validate encryption key format and require in production."""
        # Get environment from the values being validated
        environment = info.data.get("environment", "development")

        # Require in production
        if environment == "production" and not v:
            raise ValueError(
                "ENCRYPTION_KEY_V1 is required in production environment. "
                "Generate with: python3 -c \"from cryptography.fernet import Fernet; "
                "print(Fernet.generate_key().decode())\""
            )

        # Validate format if provided (Fernet keys are 44 bytes base64-encoded)
        if v and len(v) != 44:
            raise ValueError(
                "ENCRYPTION_KEY_V1 must be a valid Fernet key (44 characters base64). "
                "Generate with: python3 -c \"from cryptography.fernet import Fernet; "
                "print(Fernet.generate_key().decode())\""
            )

        return v

    @field_validator("encryption_lookup_hash_key")
    @classmethod
    def validate_lookup_hash_key(cls, v: Optional[str], info) -> Optional[str]:
        """Validate HMAC lookup hash key and require in production."""
        # Get environment from the values being validated
        environment = info.data.get("environment", "development")

        # Require in production
        if environment == "production" and not v:
            raise ValueError(
                "ENCRYPTION_LOOKUP_HASH_KEY is required in production environment. "
                "Generate with: openssl rand -hex 32"
            )

        # Validate format if provided (32 bytes hex = 64 characters)
        if v and len(v) != 64:
            raise ValueError(
                "ENCRYPTION_LOOKUP_HASH_KEY must be 64 hex characters (32 bytes). "
                "Generate with: openssl rand -hex 32"
            )

        return v

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v: str, info) -> str:
        """Validate JWT secret key length in production."""
        environment = info.data.get("environment", "development")

        if environment == "production" and len(v) < 64:
            raise ValueError(
                "SECRET_KEY must be at least 64 characters in production. "
                "Generate with: openssl rand -hex 32"
            )

        return v

    @model_validator(mode="after")
    def validate_production_security(self):
        """Comprehensive production security validation."""
        if not self.is_production:
            return self

        # Check for common placeholder values
        forbidden_placeholders = [
            "your-secret-key-here",
            "your-fernet-key",
            "change-me",
            "change_me",
            "your-password-here",
            "example.com",
            "localhost",
        ]

        for field_name in ["secret_key", "neo4j_password", "encryption_key_v1", "encryption_lookup_hash_key"]:
            field_value = getattr(self, field_name, None)
            if isinstance(field_value, str):
                for placeholder in forbidden_placeholders:
                    if placeholder in field_value.lower():
                        raise ValueError(
                            f"Production config contains placeholder value in {field_name.upper()}. "
                            f"Replace all placeholder values before deploying to production."
                        )

        # Enforce database TLS in production
        if self.db_ssl_mode == "disable":
            raise ValueError(
                "DB_SSL_MODE=disable is not allowed in production. "
                "Use 'require', 'verify-ca', or 'verify-full' for secure database connections."
            )

        return self

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

    def get_db_ssl_context(self):
        """Build an ``ssl.SSLContext`` for asyncpg, or None if TLS is disabled.

        Returns None when ``db_ssl_mode`` is ``disable`` or ``prefer`` (asyncpg
        handles ``prefer`` internally by attempting TLS opportunistically).
        Returns a configured ``SSLContext`` for ``require``, ``verify-ca``,
        and ``verify-full`` modes.
        """
        import ssl

        mode = (self.db_ssl_mode or "prefer").lower()
        if mode in ("disable", "prefer"):
            return None

        # Start from a default-secure context so we pick up the system CA
        # bundle unless db_ssl_root_cert overrides it.
        ctx = ssl.create_default_context(cafile=self.db_ssl_root_cert)
        if mode == "require":
            # Require TLS but do not validate the server certificate.
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
        elif mode == "verify-ca":
            # Validate the certificate chain but skip hostname verification.
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_REQUIRED
        elif mode == "verify-full":
            ctx.check_hostname = True
            ctx.verify_mode = ssl.CERT_REQUIRED
        return ctx

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
