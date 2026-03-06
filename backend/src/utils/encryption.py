"""
Field-level encryption utilities for sensitive data at rest.

Uses Fernet (symmetric encryption) from the cryptography library to encrypt
sensitive fields like phone numbers, SSN, and other PII.

Security:
- AES-128 encryption in CBC mode with PKCS7 padding
- HMAC for authentication (prevents tampering)
- Encryption key stored separately from database password
- Automatic key rotation support via timestamp in token
"""
import base64
import logging
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken

from src.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class EncryptionService:
    """Service for encrypting and decrypting sensitive data at rest."""

    def __init__(self):
        """
        Initialize encryption service with key from environment.

        The ENCRYPTION_KEY must be a 32-byte base64-encoded key.
        Generate with: python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
        """
        encryption_key = getattr(settings, 'encryption_key', None)

        if not encryption_key:
            logger.warning(
                "ENCRYPTION_KEY not set - encryption disabled. "
                "Sensitive data will be stored in plaintext!"
            )
            self.fernet = None
        else:
            try:
                self.fernet = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
                logger.info("Encryption service initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize encryption: {e}")
                self.fernet = None

    def encrypt(self, plaintext: str) -> Optional[str]:
        """
        Encrypt a string value.

        Args:
            plaintext: The string to encrypt

        Returns:
            Base64-encoded encrypted string, or None if encryption fails

        Example:
            encrypted = encryption_service.encrypt("555-123-4567")
            # Returns: "gAAAAABg..."
        """
        if not plaintext:
            return None

        if not self.fernet:
            logger.warning("Encryption disabled - returning plaintext")
            return plaintext

        try:
            encrypted_bytes = self.fernet.encrypt(plaintext.encode('utf-8'))
            return encrypted_bytes.decode('utf-8')
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            return None

    def decrypt(self, ciphertext: str) -> Optional[str]:
        """
        Decrypt an encrypted string value.

        Args:
            ciphertext: The encrypted string (base64-encoded)

        Returns:
            Decrypted plaintext string, or None if decryption fails

        Example:
            decrypted = encryption_service.decrypt("gAAAAABg...")
            # Returns: "555-123-4567"
        """
        if not ciphertext:
            return None

        if not self.fernet:
            logger.warning("Encryption disabled - returning ciphertext as-is")
            return ciphertext

        try:
            decrypted_bytes = self.fernet.decrypt(ciphertext.encode('utf-8'))
            return decrypted_bytes.decode('utf-8')
        except InvalidToken:
            logger.error("Decryption failed: Invalid token or tampered data")
            return None
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            return None

    def is_enabled(self) -> bool:
        """Check if encryption is enabled (key is configured)."""
        return self.fernet is not None


# Global encryption service instance
encryption_service = EncryptionService()


def encrypt_field(value: Optional[str]) -> Optional[str]:
    """
    Convenience function to encrypt a field value.

    Usage in models:
        @hybrid_property
        def phone(self):
            return decrypt_field(self._phone)

        @phone.setter
        def phone(self, value):
            self._phone = encrypt_field(value)
    """
    if not value:
        return None
    return encryption_service.encrypt(value)


def decrypt_field(value: Optional[str]) -> Optional[str]:
    """
    Convenience function to decrypt a field value.
    """
    if not value:
        return None
    return encryption_service.decrypt(value)
