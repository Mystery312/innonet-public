"""
Configuration for Feature Parity Testing Agent.

Defines environment profiles for local development and production,
with safety constraints and test execution settings.
"""

from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional


class EnvironmentType(str, Enum):
    """Environment type enumeration."""
    LOCAL = "local"
    PRODUCTION = "production"


class EnvironmentConfig(BaseModel):
    """Configuration for a test environment."""

    name: str = Field(..., description="Human-readable environment name")
    type: EnvironmentType = Field(..., description="Environment type")
    base_url: str = Field(..., description="Base URL for API requests")
    api_prefix: str = Field(default="/api/v1", description="API prefix path")

    # Safety constraints
    read_only: bool = Field(default=False, description="Whether to run tests in read-only mode")
    create_test_users: bool = Field(default=True, description="Whether to create new test users")

    # Credentials
    test_user_email: Optional[str] = Field(default=None, description="Test user email")
    test_user_password: Optional[str] = Field(default=None, description="Test user password")

    # Request settings
    request_timeout: float = Field(default=30.0, description="Request timeout in seconds")
    request_delay: float = Field(default=0.0, description="Delay between requests in seconds")

    class Config:
        use_enum_values = False

    @property
    def full_url(self) -> str:
        """Get full API URL combining base_url and api_prefix."""
        return f"{self.base_url}{self.api_prefix}"

    @property
    def is_production(self) -> bool:
        """Check if this is a production environment."""
        return self.type == EnvironmentType.PRODUCTION


# Local Development Configuration
LOCAL_CONFIG = EnvironmentConfig(
    name="Local Development",
    type=EnvironmentType.LOCAL,
    base_url="http://localhost:8000",
    api_prefix="/api/v1",
    read_only=False,
    create_test_users=True,
    test_user_email=None,  # Will be dynamically generated
    test_user_password="TestPassword123!",
    request_timeout=30.0,
    request_delay=0.0,
)

# Production Configuration
PRODUCTION_CONFIG = EnvironmentConfig(
    name="Hong Kong Production",
    type=EnvironmentType.PRODUCTION,
    base_url="https://innonet.work",
    api_prefix="/api/v1",
    read_only=True,  # Safety: no mutations in production
    create_test_users=False,  # Use pre-created account
    test_user_email="test_readonly@innonet.work",
    test_user_password=None,  # Will be read from environment variable
    request_timeout=30.0,
    request_delay=0.5,  # Respectful rate limiting
)


class TestConfig(BaseModel):
    """Overall test execution configuration."""

    environments: list[EnvironmentType] = Field(
        default=[EnvironmentType.LOCAL, EnvironmentType.PRODUCTION],
        description="Environments to test"
    )
    test_suites: list[str] = Field(
        default=[
            "auth",
            "profile",
            "events",
            "network",
            "graph",
            "communities",
            "messaging",
            "companies",
            "discover",
        ],
        description="Test suites to run"
    )
    verbose: bool = Field(default=True, description="Verbose output")
    generate_html_report: bool = Field(default=True, description="Generate HTML report")
    generate_json_report: bool = Field(default=True, description="Generate JSON report")
    output_dir: str = Field(default="test_results", description="Output directory for reports")


def get_environment_config(env_type: EnvironmentType) -> EnvironmentConfig:
    """Get configuration for an environment type."""
    if env_type == EnvironmentType.LOCAL:
        return LOCAL_CONFIG
    elif env_type == EnvironmentType.PRODUCTION:
        return PRODUCTION_CONFIG
    else:
        raise ValueError(f"Unknown environment type: {env_type}")


def get_all_configs() -> list[EnvironmentConfig]:
    """Get all environment configurations."""
    return [LOCAL_CONFIG, PRODUCTION_CONFIG]
