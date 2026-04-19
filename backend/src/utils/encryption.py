"""
Field-level encryption utilities for sensitive data at rest.

Provides:
- Versioned Fernet encryption (``v{N}:{token}``) to enable zero-downtime key rotation.
- Deterministic HMAC-SHA256 lookup hashes for columns that need exact-match queries
  (login email/phone, waitlist email) — separate key space from encryption keys.
- SQLAlchemy TypeDecorators (``EncryptedString``, ``EncryptedText``, ``EncryptedJSON``)
  for transparent encrypt-on-write / decrypt-on-read.

Back-compat:
- Legacy unversioned Fernet tokens (produced by earlier ``encrypt_field``) are decrypted
  as if they were ``v1:<token>``.
- ``encrypt_field`` / ``decrypt_field`` remain as thin shims over ``EncryptionService``.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
from typing import Any, Dict, Optional

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import String, Text
from sqlalchemy.types import TypeDecorator

from src.config import get_settings

logger = logging.getLogger(__name__)

VERSION_PREFIX = "v"
VERSION_SEPARATOR = ":"


class EncryptionService:
    """
    Versioned symmetric encryption service.

    Keys are loaded from settings as ``encryption_key_v1`` / ``_v2`` / ``_v3``.
    New writes always use ``encryption_current_version``. Reads select the
    correct key from the prefix of the ciphertext.
    """

    def __init__(self) -> None:
        settings = get_settings()

        self._keys: Dict[int, Fernet] = {}
        self._current_version: int = int(getattr(settings, "encryption_current_version", 1) or 1)

        # Load versioned keys. Also support legacy single ``encryption_key`` as v1.
        legacy_key = getattr(settings, "encryption_key", None)
        key_sources = {
            1: getattr(settings, "encryption_key_v1", None) or legacy_key,
            2: getattr(settings, "encryption_key_v2", None),
            3: getattr(settings, "encryption_key_v3", None),
        }

        for version, raw_key in key_sources.items():
            if not raw_key:
                continue
            try:
                key_bytes = raw_key.encode() if isinstance(raw_key, str) else raw_key
                self._keys[version] = Fernet(key_bytes)
            except Exception as exc:
                logger.error("Failed to initialize encryption key v%s: %s", version, exc)

        if not self._keys:
            logger.warning(
                "No ENCRYPTION_KEY_V* configured - encryption disabled. "
                "Sensitive data will be stored in plaintext!"
            )
        elif self._current_version not in self._keys:
            logger.error(
                "ENCRYPTION_CURRENT_VERSION=%s but no matching key loaded; "
                "falling back to the lowest configured version.",
                self._current_version,
            )
            self._current_version = min(self._keys.keys())
        else:
            logger.info(
                "Encryption service initialized: current=v%s, available=%s",
                self._current_version,
                sorted(self._keys.keys()),
            )

        # HMAC lookup hash key (separate from encryption keys).
        hash_key = getattr(settings, "encryption_lookup_hash_key", None)
        if hash_key:
            self._hash_key: Optional[bytes] = (
                hash_key.encode("utf-8") if isinstance(hash_key, str) else hash_key
            )
        else:
            self._hash_key = None
            if self._keys:
                logger.warning(
                    "ENCRYPTION_LOOKUP_HASH_KEY not set - lookup hashes cannot be computed."
                )

    # ------------------------------------------------------------------ #
    # Properties
    # ------------------------------------------------------------------ #

    def is_enabled(self) -> bool:
        """Encryption is enabled when at least one key is configured."""
        return bool(self._keys)

    def has_hash_key(self) -> bool:
        return self._hash_key is not None

    @property
    def current_version(self) -> int:
        return self._current_version

    # ------------------------------------------------------------------ #
    # Encryption / decryption
    # ------------------------------------------------------------------ #

    def encrypt(self, plaintext: Optional[str]) -> Optional[str]:
        """Encrypt plaintext using the current key version.

        Returns a string of the form ``v{current_version}:{fernet_token}``.
        Empty/None inputs return None. If no key is configured, returns the
        plaintext unchanged (with a warning), matching the legacy behavior.
        """
        if plaintext is None or plaintext == "":
            return None

        if not self._keys:
            logger.warning("Encryption disabled - returning plaintext")
            return plaintext

        fernet = self._keys[self._current_version]
        try:
            token = fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")
            return f"{VERSION_PREFIX}{self._current_version}{VERSION_SEPARATOR}{token}"
        except Exception as exc:
            logger.error("Encryption failed: %s", exc)
            return None

    def decrypt(self, ciphertext: Optional[str]) -> Optional[str]:
        """Decrypt a ciphertext produced by ``encrypt``.

        Transparently handles legacy unversioned Fernet tokens: if the input
        does not carry a ``v{N}:`` prefix, it is decrypted with the v1 key
        and the result is returned (for back-compat with existing rows
        encrypted by the old ``encrypt_field`` implementation).
        """
        if ciphertext is None or ciphertext == "":
            return None

        if not self._keys:
            logger.warning("Encryption disabled - returning ciphertext as-is")
            return ciphertext

        version, token = self._parse_versioned(ciphertext)
        fernet = self._keys.get(version)
        if fernet is None:
            logger.error("No encryption key available for version v%s", version)
            return None

        try:
            return fernet.decrypt(token.encode("utf-8")).decode("utf-8")
        except InvalidToken:
            logger.error("Decryption failed: invalid token or tampered data (v%s)", version)
            return None
        except Exception as exc:
            logger.error("Decryption failed: %s", exc)
            return None

    def _parse_versioned(self, ciphertext: str) -> tuple[int, str]:
        """Return ``(version, raw_token)``. Legacy unversioned tokens → (1, ciphertext)."""
        if (
            ciphertext.startswith(VERSION_PREFIX)
            and VERSION_SEPARATOR in ciphertext
        ):
            head, _, token = ciphertext.partition(VERSION_SEPARATOR)
            digits = head[len(VERSION_PREFIX):]
            if digits.isdigit():
                return int(digits), token
        # Legacy: treat as v1.
        return 1, ciphertext

    # ------------------------------------------------------------------ #
    # Deterministic lookup hashes
    # ------------------------------------------------------------------ #

    def compute_lookup_hash(self, value: Optional[str]) -> Optional[str]:
        """Compute a deterministic HMAC-SHA256 hex digest of ``value``.

        The value is normalized (stripped + lowercased) before hashing so that
        casing/whitespace differences do not produce distinct hashes. Returns
        None if the value is falsy or no hash key is configured.
        """
        if value is None or value == "":
            return None
        if self._hash_key is None:
            logger.warning(
                "Cannot compute lookup hash - ENCRYPTION_LOOKUP_HASH_KEY not configured."
            )
            return None

        normalized = value.strip().lower().encode("utf-8")
        return hmac.new(self._hash_key, normalized, hashlib.sha256).hexdigest()


# Global encryption service instance (lazy).
encryption_service = EncryptionService()


# ---------------------------------------------------------------------- #
# Phase 2: Helper functions for reading from encrypted columns
# ---------------------------------------------------------------------- #

def should_use_encrypted_columns() -> bool:
    """
    Check if we should read from encrypted columns (*_ct) instead of plaintext.

    Returns True if:
    - USE_ENCRYPTED_COLUMNS feature flag is enabled in settings
    - Encryption service is properly configured with keys

    This enables gradual rollout of Phase 2 (read-switching).
    """
    from src.config import get_settings
    settings = get_settings()

    # Feature flag must be enabled
    if not settings.use_encrypted_columns:
        return False

    # Encryption service must have keys loaded
    if not encryption_service.is_enabled():
        logger.warning(
            "USE_ENCRYPTED_COLUMNS=true but encryption keys not configured. "
            "Falling back to plaintext reads."
        )
        return False

    return True


def read_encrypted_field(obj, plaintext_attr: str, ciphertext_attr: str) -> Optional[str]:
    """
    Read a field from either plaintext or encrypted column based on feature flag.

    Phase 2 read logic:
    - If USE_ENCRYPTED_COLUMNS=true: read from ciphertext column and decrypt
    - If USE_ENCRYPTED_COLUMNS=false: read from plaintext column (Phase 1 behavior)

    Args:
        obj: SQLAlchemy model instance
        plaintext_attr: Name of plaintext attribute (e.g., "email")
        ciphertext_attr: Name of ciphertext attribute (e.g., "email_ct")

    Returns:
        Decrypted value if using encrypted columns, otherwise plaintext value

    Example:
        # In service layer
        email = read_encrypted_field(user, "email", "email_ct")
    """
    if should_use_encrypted_columns():
        # Phase 2: Read from encrypted column
        ciphertext = getattr(obj, ciphertext_attr, None)
        if ciphertext is None:
            # Fallback to plaintext if encrypted column is empty (migration in progress)
            logger.debug(
                f"{obj.__class__.__name__}.{ciphertext_attr} is None, "
                f"falling back to {plaintext_attr}"
            )
            return getattr(obj, plaintext_attr, None)
        return encryption_service.decrypt(ciphertext)
    else:
        # Phase 1: Read from plaintext column
        return getattr(obj, plaintext_attr, None)


# ---------------------------------------------------------------------- #
# Back-compat shims (used by src/auth/oauth.py).
# ---------------------------------------------------------------------- #

def encrypt_field(value: Optional[str]) -> Optional[str]:
    """Shim for legacy call sites. Produces versioned ciphertext."""
    if value is None or value == "":
        return None
    return encryption_service.encrypt(value)


def decrypt_field(value: Optional[str]) -> Optional[str]:
    """Shim for legacy call sites. Handles both versioned and legacy tokens."""
    if value is None or value == "":
        return None
    return encryption_service.decrypt(value)


def compute_lookup_hash(value: Optional[str]) -> Optional[str]:
    """Module-level convenience wrapper around ``EncryptionService.compute_lookup_hash``."""
    return encryption_service.compute_lookup_hash(value)


# ---------------------------------------------------------------------- #
# SQLAlchemy TypeDecorators — transparent encrypt/decrypt at ORM layer.
# ---------------------------------------------------------------------- #

class _EncryptedMixin:
    """Mixin implementing the encrypt-on-write / decrypt-on-read logic."""

    cache_ok = True

    def process_bind_param(self, value, dialect):  # type: ignore[override]
        if value is None:
            return None
        return encryption_service.encrypt(value)

    def process_result_value(self, value, dialect):  # type: ignore[override]
        if value is None:
            return None
        return encryption_service.decrypt(value)


class EncryptedString(_EncryptedMixin, TypeDecorator):
    """Transparent-encryption column backed by VARCHAR(length).

    Note: ``length`` is the **storage** length; the Fernet ciphertext is ~4x the
    plaintext length. Size the DB column accordingly (e.g. 500 chars for emails).
    """

    impl = String
    cache_ok = True

    def __init__(self, length: int = 500, *args: Any, **kwargs: Any) -> None:
        super().__init__(length, *args, **kwargs)


class EncryptedText(_EncryptedMixin, TypeDecorator):
    """Transparent-encryption column backed by TEXT (unbounded)."""

    impl = Text
    cache_ok = True


class EncryptedJSON(_EncryptedMixin, TypeDecorator):
    """Transparent-encryption column for JSON-serializable dicts.

    Values are JSON-serialized before encryption and JSON-parsed after
    decryption. The underlying storage type is TEXT.
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):  # type: ignore[override]
        if value is None:
            return None
        try:
            serialized = json.dumps(value, separators=(",", ":"), default=str)
        except (TypeError, ValueError) as exc:
            logger.error("EncryptedJSON bind failed: %s", exc)
            return None
        return encryption_service.encrypt(serialized)

    def process_result_value(self, value, dialect):  # type: ignore[override]
        if value is None:
            return None
        decrypted = encryption_service.decrypt(value)
        if decrypted is None:
            return None
        try:
            return json.loads(decrypted)
        except (TypeError, ValueError) as exc:
            logger.error("EncryptedJSON parse failed: %s", exc)
            return None
