import uuid
from datetime import datetime
from typing import Optional, Tuple
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth.models import User, UserProfile, RefreshToken
from src.auth.schemas import UserRegisterRequest
from src.auth.utils import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
    get_token_expiry,
)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, data: UserRegisterRequest) -> Tuple[User, str, str]:
        # Check if username exists
        existing = await self.db.execute(
            select(User).where(User.username == data.username)
        )
        if existing.scalar_one_or_none():
            raise ValueError("Username already exists")

        # Check if email exists
        if data.email:
            existing = await self.db.execute(
                select(User).where(User.email == data.email)
            )
            if existing.scalar_one_or_none():
                raise ValueError("Email already registered")

        # Check if phone exists
        if data.phone:
            existing = await self.db.execute(
                select(User).where(User.phone == data.phone)
            )
            if existing.scalar_one_or_none():
                raise ValueError("Phone number already registered")

        # Create user
        user = User(
            username=data.username,
            email=data.email,
            phone=data.phone,
            password_hash=hash_password(data.password),
        )
        self.db.add(user)
        await self.db.flush()

        # Create empty profile
        profile = UserProfile(user_id=user.id)
        self.db.add(profile)

        # Generate tokens
        access_token = create_access_token({"sub": str(user.id), "username": user.username})
        refresh_token = create_refresh_token({"sub": str(user.id)})

        # Store refresh token
        await self._store_refresh_token(user.id, refresh_token)

        await self.db.commit()
        await self.db.refresh(user)

        return user, access_token, refresh_token

    async def login(self, identifier: str, password: str) -> Tuple[User, str, str]:
        # Find user by username, email, or phone
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.profile))
            .where(
                or_(
                    User.username == identifier,
                    User.email == identifier,
                    User.phone == identifier,
                )
            )
        )
        user = result.scalar_one_or_none()

        if not user:
            raise ValueError("Invalid credentials")

        if not verify_password(password, user.password_hash):
            raise ValueError("Invalid credentials")

        if not user.is_active:
            raise ValueError("Account is deactivated")

        # Generate tokens
        access_token = create_access_token({"sub": str(user.id), "username": user.username})
        refresh_token = create_refresh_token({"sub": str(user.id)})

        # Store refresh token
        await self._store_refresh_token(user.id, refresh_token)
        await self.db.commit()

        return user, access_token, refresh_token

    async def refresh_tokens(self, refresh_token: str) -> Tuple[str, str]:
        # Decode and validate refresh token
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise ValueError("Invalid refresh token")

        user_id = uuid.UUID(payload["sub"])

        # Check if token is in database and not revoked
        token_hash = hash_token(refresh_token)
        result = await self.db.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked_at.is_(None),
            )
        )
        stored_token = result.scalar_one_or_none()

        if not stored_token:
            raise ValueError("Token has been revoked")

        if stored_token.expires_at < datetime.utcnow():
            raise ValueError("Refresh token expired")

        # Get user
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            raise ValueError("User not found or inactive")

        # Revoke old refresh token
        stored_token.revoked_at = datetime.utcnow()

        # Generate new tokens
        new_access_token = create_access_token({"sub": str(user.id), "username": user.username})
        new_refresh_token = create_refresh_token({"sub": str(user.id)})

        # Store new refresh token
        await self._store_refresh_token(user.id, new_refresh_token)
        await self.db.commit()

        return new_access_token, new_refresh_token

    async def logout(self, refresh_token: str) -> bool:
        token_hash = hash_token(refresh_token)
        result = await self.db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        stored_token = result.scalar_one_or_none()

        if stored_token:
            stored_token.revoked_at = datetime.utcnow()
            await self.db.commit()
            return True

        return False

    async def get_user_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        result = await self.db.execute(
            select(User).options(selectinload(User.profile)).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def _store_refresh_token(self, user_id: uuid.UUID, token: str) -> RefreshToken:
        token_hash = hash_token(token)
        expires_at = get_token_expiry(token)

        refresh_token = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(refresh_token)
        return refresh_token
