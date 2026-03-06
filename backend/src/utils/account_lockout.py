"""
Account lockout utilities for preventing brute force attacks.

Uses Redis to track failed login attempts and lock accounts temporarily.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional
import redis.asyncio as redis

from src.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Lockout configuration
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15
FAILED_ATTEMPT_TTL_MINUTES = 60  # Reset counter after 1 hour of no attempts


class AccountLockoutManager:
    """Manages account lockout state in Redis."""

    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None

    async def _get_redis(self) -> redis.Redis:
        """Get or create Redis connection."""
        if self.redis_client is None:
            # Get Redis URL (supports both connection string and individual vars)
            redis_url = settings.get_redis_url()
            self.redis_client = redis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True
            )
        return self.redis_client

    def _get_attempt_key(self, identifier: str) -> str:
        """Get Redis key for failed attempt counter."""
        return f"login:failed:{identifier}"

    def _get_lockout_key(self, identifier: str) -> str:
        """Get Redis key for lockout status."""
        return f"login:locked:{identifier}"

    async def is_locked_out(self, identifier: str) -> bool:
        """Check if account is currently locked out."""
        try:
            redis_client = await self._get_redis()
            lockout_key = self._get_lockout_key(identifier)
            locked = await redis_client.exists(lockout_key)
            return bool(locked)
        except Exception as e:
            logger.error(f"Error checking lockout status: {e}")
            # Fail open - don't block login if Redis is down
            return False

    async def get_lockout_expiry(self, identifier: str) -> Optional[datetime]:
        """Get the expiry time of current lockout, if any."""
        try:
            redis_client = await self._get_redis()
            lockout_key = self._get_lockout_key(identifier)
            ttl = await redis_client.ttl(lockout_key)

            if ttl > 0:
                return datetime.utcnow() + timedelta(seconds=ttl)
            return None
        except Exception as e:
            logger.error(f"Error getting lockout expiry: {e}")
            return None

    async def record_failed_attempt(self, identifier: str) -> dict:
        """
        Record a failed login attempt.

        Returns dict with:
        - attempts: current count of failed attempts
        - locked: whether account is now locked
        - lockout_until: datetime when lockout expires (if locked)
        """
        try:
            redis_client = await self._get_redis()
            attempt_key = self._get_attempt_key(identifier)
            lockout_key = self._get_lockout_key(identifier)

            # Increment failed attempt counter
            attempts = await redis_client.incr(attempt_key)

            # Set TTL on first attempt
            if attempts == 1:
                await redis_client.expire(
                    attempt_key,
                    FAILED_ATTEMPT_TTL_MINUTES * 60
                )

            # Check if we should lock the account
            if attempts >= MAX_FAILED_ATTEMPTS:
                # Lock the account
                lockout_duration = LOCKOUT_DURATION_MINUTES * 60
                await redis_client.setex(
                    lockout_key,
                    lockout_duration,
                    str(datetime.utcnow().isoformat())
                )

                # Reset attempt counter
                await redis_client.delete(attempt_key)

                logger.warning(
                    f"Account locked due to {attempts} failed attempts: {identifier}"
                )

                return {
                    "attempts": attempts,
                    "locked": True,
                    "lockout_until": datetime.utcnow() + timedelta(seconds=lockout_duration)
                }

            return {
                "attempts": attempts,
                "locked": False,
                "remaining_attempts": MAX_FAILED_ATTEMPTS - attempts
            }

        except Exception as e:
            logger.error(f"Error recording failed attempt: {e}")
            # Fail open - return safe defaults
            return {
                "attempts": 0,
                "locked": False
            }

    async def clear_failed_attempts(self, identifier: str):
        """Clear failed attempt counter (called on successful login)."""
        try:
            redis_client = await self._get_redis()
            attempt_key = self._get_attempt_key(identifier)
            await redis_client.delete(attempt_key)
        except Exception as e:
            logger.error(f"Error clearing failed attempts: {e}")

    async def unlock_account(self, identifier: str):
        """Manually unlock an account (admin function)."""
        try:
            redis_client = await self._get_redis()
            attempt_key = self._get_attempt_key(identifier)
            lockout_key = self._get_lockout_key(identifier)

            await redis_client.delete(attempt_key)
            await redis_client.delete(lockout_key)

            logger.info(f"Account manually unlocked: {identifier}")
        except Exception as e:
            logger.error(f"Error unlocking account: {e}")

    async def get_failed_attempts(self, identifier: str) -> int:
        """Get current count of failed login attempts."""
        try:
            redis_client = await self._get_redis()
            attempt_key = self._get_attempt_key(identifier)
            attempts = await redis_client.get(attempt_key)
            return int(attempts) if attempts else 0
        except Exception as e:
            logger.error(f"Error getting failed attempts: {e}")
            return 0


# Global instance
lockout_manager = AccountLockoutManager()
