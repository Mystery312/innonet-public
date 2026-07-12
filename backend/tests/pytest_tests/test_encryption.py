"""
Encryption unit tests.

Verifies that TypeDecorators correctly encrypt on write and decrypt on read,
and that HMAC lookup hashes are deterministic.
"""
import pytest
from src.utils.encryption import (
    EncryptionService,
    encryption_service,
    compute_lookup_hash,
)


def test_encrypt_decrypt_roundtrip():
    svc = encryption_service
    if not svc.is_enabled():
        pytest.skip("Encryption keys not configured")
    plaintext = "user@example.com"
    ciphertext = svc.encrypt(plaintext)
    assert ciphertext is not None
    assert ciphertext != plaintext
    assert ciphertext.startswith("v1:")
    assert svc.decrypt(ciphertext) == plaintext


def test_encrypt_none_returns_none():
    assert encryption_service.encrypt(None) is None
    assert encryption_service.decrypt(None) is None


def test_encrypt_empty_returns_none():
    assert encryption_service.encrypt("") is None
    assert encryption_service.decrypt("") is None


def test_lookup_hash_deterministic():
    h1 = compute_lookup_hash("user@example.com")
    h2 = compute_lookup_hash("user@example.com")
    assert h1 == h2
    assert h1 is not None


def test_lookup_hash_case_insensitive():
    h1 = compute_lookup_hash("User@Example.COM")
    h2 = compute_lookup_hash("user@example.com")
    assert h1 == h2


def test_lookup_hash_different_values():
    h1 = compute_lookup_hash("alice@example.com")
    h2 = compute_lookup_hash("bob@example.com")
    assert h1 != h2


def test_ciphertext_is_non_deterministic():
    svc = encryption_service
    if not svc.is_enabled():
        pytest.skip("Encryption keys not configured")
    plaintext = "test@example.com"
    c1 = svc.encrypt(plaintext)
    c2 = svc.encrypt(plaintext)
    assert c1 != c2  # Fernet includes a random IV


def test_versioned_prefix():
    svc = encryption_service
    if not svc.is_enabled():
        pytest.skip("Encryption keys not configured")
    ct = svc.encrypt("hello")
    assert ct.startswith(f"v{svc.current_version}:")


def test_tampered_token_returns_none():
    svc = encryption_service
    if not svc.is_enabled():
        pytest.skip("Encryption keys not configured")
    ct = svc.encrypt("hello")
    tampered = ct[:-5] + "XXXXX"
    assert svc.decrypt(tampered) is None
