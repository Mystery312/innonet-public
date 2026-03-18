import logging
import secrets
from datetime import datetime, timezone
from typing import Optional, Tuple

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth.models import User, UserProfile, OAuthAccount, utc_now
from src.auth.utils import create_access_token, create_refresh_token
from src.auth.service import AuthService
from src.config import get_settings
from src.utils.encryption import encrypt_field

logger = logging.getLogger(__name__)
settings = get_settings()

# OAuth provider configurations
OAUTH_PROVIDERS = {
    "google": {
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v3/userinfo",
        "scopes": ["openid", "email", "profile"],
    },
    "microsoft": {
        "authorize_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        "userinfo_url": "https://graph.microsoft.com/v1.0/me",
        "scopes": ["openid", "email", "profile", "User.Read"],
    },
}


class OAuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def get_authorize_url(self, provider: str, state: str, redirect_uri: str) -> str:
        """Generate the OAuth authorization URL for the given provider."""
        if provider not in OAUTH_PROVIDERS:
            raise ValueError(f"Unsupported OAuth provider: {provider}")

        config = OAUTH_PROVIDERS[provider]
        client_id = self._get_client_id(provider)

        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(config["scopes"]),
            "state": state,
            "access_type": "offline",
            "prompt": "consent",
        }

        url = httpx.URL(config["authorize_url"], params=params)
        return str(url)

    async def handle_callback(
        self, provider: str, code: str, redirect_uri: str
    ) -> Tuple[User, str, str]:
        """
        Handle OAuth callback: exchange code for tokens, fetch user info,
        find or create user, and return JWT tokens.
        """
        # Exchange authorization code for provider tokens
        token_data = await self._exchange_code(provider, code, redirect_uri)
        provider_access_token = token_data["access_token"]

        # Fetch user info from provider
        user_info = await self._get_user_info(provider, provider_access_token)
        provider_user_id = user_info["id"]
        email = user_info.get("email")
        name = user_info.get("name")

        # Find or create user and link OAuth account
        user = await self._find_or_create_user(
            provider=provider,
            provider_user_id=provider_user_id,
            email=email,
            name=name,
            provider_access_token=provider_access_token,
            provider_refresh_token=token_data.get("refresh_token"),
            token_expires_in=token_data.get("expires_in"),
        )

        # Generate JWT tokens
        access_token = create_access_token({"sub": str(user.id), "username": user.username})
        refresh_token = create_refresh_token({"sub": str(user.id)})

        # Store refresh token
        auth_service = AuthService(self.db)
        await auth_service._store_refresh_token(user.id, refresh_token)
        await self.db.commit()

        return user, access_token, refresh_token

    async def _exchange_code(self, provider: str, code: str, redirect_uri: str) -> dict:
        """Exchange authorization code for access token with the provider."""
        config = OAUTH_PROVIDERS[provider]
        client_id = self._get_client_id(provider)
        client_secret = self._get_client_secret(provider)

        async with httpx.AsyncClient() as client:
            response = await client.post(
                config["token_url"],
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": client_id,
                    "client_secret": client_secret,
                },
                headers={"Accept": "application/json"},
            )

            if response.status_code != 200:
                logger.error(f"OAuth token exchange failed for {provider}: {response.text}")
                raise ValueError(f"Failed to exchange authorization code with {provider}")

            return response.json()

    async def _get_user_info(self, provider: str, access_token: str) -> dict:
        """Fetch user profile information from the OAuth provider."""
        config = OAUTH_PROVIDERS[provider]

        async with httpx.AsyncClient() as client:
            response = await client.get(
                config["userinfo_url"],
                headers={"Authorization": f"Bearer {access_token}"},
            )

            if response.status_code != 200:
                logger.error(f"OAuth userinfo failed for {provider}: {response.text}")
                raise ValueError(f"Failed to fetch user info from {provider}")

            data = response.json()

        # Normalize user info across providers
        if provider == "google":
            return {
                "id": data["sub"],
                "email": data.get("email"),
                "name": data.get("name"),
                "picture": data.get("picture"),
            }
        elif provider == "microsoft":
            return {
                "id": data["id"],
                "email": data.get("mail") or data.get("userPrincipalName"),
                "name": data.get("displayName"),
                "picture": None,
            }

        raise ValueError(f"Unsupported provider: {provider}")

    async def _find_or_create_user(
        self,
        provider: str,
        provider_user_id: str,
        email: Optional[str],
        name: Optional[str],
        provider_access_token: str,
        provider_refresh_token: Optional[str],
        token_expires_in: Optional[int],
    ) -> User:
        """
        Find existing user or create new one based on OAuth info.

        Linking logic:
        1. Look up OAuthAccount by (provider, provider_user_id) -> login as linked user
        2. Look up User by email -> create OAuthAccount linked to existing user
        3. Neither found -> create new User + UserProfile + OAuthAccount
        """
        now = utc_now()

        # Calculate token expiry
        token_expires_at = None
        if token_expires_in:
            token_expires_at = datetime.fromtimestamp(
                datetime.now(timezone.utc).timestamp() + token_expires_in,
                tz=timezone.utc
            ).replace(tzinfo=None)

        # 1. Check for existing OAuth account
        result = await self.db.execute(
            select(OAuthAccount)
            .options(selectinload(OAuthAccount.user).selectinload(User.profile))
            .where(
                OAuthAccount.provider == provider,
                OAuthAccount.provider_user_id == provider_user_id,
            )
        )
        oauth_account = result.scalar_one_or_none()

        if oauth_account:
            # Update tokens
            oauth_account.access_token = encrypt_field(provider_access_token)
            if provider_refresh_token:
                oauth_account.refresh_token = encrypt_field(provider_refresh_token)
            oauth_account.token_expires_at = token_expires_at
            oauth_account.updated_at = now

            # Ensure user is loaded with profile
            result = await self.db.execute(
                select(User).options(selectinload(User.profile)).where(User.id == oauth_account.user_id)
            )
            user = result.scalar_one()
            return user

        # 2. Check for existing user by email
        user = None
        if email:
            result = await self.db.execute(
                select(User).options(selectinload(User.profile)).where(User.email == email)
            )
            user = result.scalar_one_or_none()

        if user:
            # Link OAuth account to existing user
            oauth_account = OAuthAccount(
                user_id=user.id,
                provider=provider,
                provider_user_id=provider_user_id,
                provider_email=email,
                access_token=encrypt_field(provider_access_token),
                refresh_token=encrypt_field(provider_refresh_token) if provider_refresh_token else None,
                token_expires_at=token_expires_at,
            )
            self.db.add(oauth_account)

            # Mark email as verified since provider verified it
            if not user.is_verified:
                user.is_verified = True

            return user

        # 3. Create new user
        username = self._generate_username(email, name)
        user = User(
            username=username,
            email=email,
            password_hash=None,  # OAuth-only user, no password
            is_active=True,
            is_verified=True,  # Provider verified the email
        )
        self.db.add(user)
        await self.db.flush()  # Get the user ID

        # Create profile
        profile = UserProfile(
            user_id=user.id,
            full_name=name,
        )
        self.db.add(profile)

        # Create OAuth account
        oauth_account = OAuthAccount(
            user_id=user.id,
            provider=provider,
            provider_user_id=provider_user_id,
            provider_email=email,
            access_token=encrypt_field(provider_access_token),
            refresh_token=encrypt_field(provider_refresh_token) if provider_refresh_token else None,
            token_expires_at=token_expires_at,
        )
        self.db.add(oauth_account)

        return user

    def _generate_username(self, email: Optional[str], name: Optional[str]) -> str:
        """Generate a unique username from email or name."""
        base = ""
        if email:
            base = email.split("@")[0]
        elif name:
            base = name.lower().replace(" ", "_")
        else:
            base = "user"

        # Clean up: only allow alphanumeric and underscores
        base = "".join(c if c.isalnum() or c == "_" else "" for c in base)

        # Ensure minimum length
        if len(base) < 3:
            base = f"user_{base}"

        # Add random suffix to ensure uniqueness
        suffix = secrets.token_hex(4)
        return f"{base}_{suffix}"[:50]

    def _get_client_id(self, provider: str) -> str:
        if provider == "google":
            return settings.google_client_id
        elif provider == "microsoft":
            return settings.microsoft_client_id
        raise ValueError(f"Unknown provider: {provider}")

    def _get_client_secret(self, provider: str) -> str:
        if provider == "google":
            return settings.google_client_secret
        elif provider == "microsoft":
            return settings.microsoft_client_secret
        raise ValueError(f"Unknown provider: {provider}")

