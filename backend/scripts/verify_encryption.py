"""Verify that the field-level encryption system is correctly wired.

Runs:
  1. An encrypt → decrypt round-trip using the current key version.
  2. An HMAC lookup-hash consistency check (same input → same hash, 64 hex chars).
  3. A legacy-ciphertext fallback check (unversioned token → treated as v1).
  4. A sample inspection of ``users`` rows to confirm ``email_ct`` and
     ``email_lookup_hash`` are populated after Phase 1 rollout.

Usage (from backend/):
    python -m scripts.verify_encryption
    python -m scripts.verify_encryption --sample 10

Exits non-zero on failure so CI can rely on it.
"""
from __future__ import annotations

import argparse
import asyncio
import sys

from sqlalchemy import text as sa_text

from src.config import get_settings
from src.database.postgres import AsyncSessionLocal
from src.utils.encryption import (
    compute_lookup_hash,
    encryption_service,
)


GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"


def _ok(msg: str) -> None:
    print(f"{GREEN}[OK]{RESET}   {msg}")


def _fail(msg: str) -> None:
    print(f"{RED}[FAIL]{RESET} {msg}")


def _warn(msg: str) -> None:
    print(f"{YELLOW}[WARN]{RESET} {msg}")


def check_roundtrip() -> bool:
    """Encrypt then decrypt a known value and verify equality."""
    if not encryption_service.is_enabled():
        _fail("Encryption disabled: no ENCRYPTION_KEY_V* configured.")
        return False

    sample = "hello+world@example.com / résumé / \u4f60\u597d"
    token = encryption_service.encrypt(sample)
    if token is None:
        _fail("encrypt() returned None")
        return False

    current_v = encryption_service.current_version
    expected_prefix = f"v{current_v}:"
    if not token.startswith(expected_prefix):
        _fail(f"Ciphertext missing expected prefix '{expected_prefix}': {token[:20]}...")
        return False

    decrypted = encryption_service.decrypt(token)
    if decrypted != sample:
        _fail(f"Round-trip mismatch: got {decrypted!r}, expected {sample!r}")
        return False

    _ok(f"Encrypt/decrypt round-trip OK (v{current_v}, {len(token)}-char token)")
    return True


def check_hash_consistency() -> bool:
    """Same input → same 64-char hex digest; normalization (strip/lower) applied."""
    if not encryption_service.has_hash_key():
        _fail("ENCRYPTION_LOOKUP_HASH_KEY not set: cannot verify lookup hashes.")
        return False

    value = "Alice@Example.COM"
    h1 = compute_lookup_hash(value)
    h2 = compute_lookup_hash("  alice@example.com  ")  # whitespace + case differ
    if h1 is None or h2 is None:
        _fail("compute_lookup_hash returned None")
        return False
    if h1 != h2:
        _fail(f"Hash normalization broken: {h1} != {h2}")
        return False
    if len(h1) != 64 or not all(c in "0123456789abcdef" for c in h1):
        _fail(f"Hash is not 64-char hex: {h1!r}")
        return False
    _ok(f"HMAC lookup hash consistent & normalized (len={len(h1)}) — {h1[:12]}...")
    return True


def check_legacy_fallback() -> bool:
    """Ciphertext without a version prefix should decrypt via the v1 key."""
    if 1 not in encryption_service._keys:
        _warn("No v1 key loaded; skipping legacy-fallback check.")
        return True

    # Build a raw (unversioned) Fernet token directly with the v1 key.
    legacy_token = encryption_service._keys[1].encrypt(b"legacy-payload").decode("utf-8")
    decrypted = encryption_service.decrypt(legacy_token)
    if decrypted != "legacy-payload":
        _fail(f"Legacy (unversioned) decrypt failed: got {decrypted!r}")
        return False
    _ok("Legacy unversioned ciphertext decrypts as v1 (back-compat OK)")
    return True


async def check_db_sample(sample_size: int) -> bool:
    """Inspect the first N users and confirm *_ct / lookup-hash columns are populated."""
    if sample_size <= 0:
        return True

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            sa_text(
                "SELECT id, email, email_ct, email_lookup_hash "
                "FROM users "
                "WHERE email IS NOT NULL "
                "ORDER BY created_at DESC "
                "LIMIT :n"
            ),
            {"n": sample_size},
        )
        rows = result.fetchall()

    if not rows:
        _warn("No users found — skipping DB sample check.")
        return True

    problems = 0
    for row in rows:
        user_id, email, email_ct, lookup_hash = row
        if not email_ct:
            _fail(f"user {user_id}: email_ct is NULL (dual-write missing)")
            problems += 1
            continue
        if not email_ct.startswith("v") or ":" not in email_ct:
            _fail(f"user {user_id}: email_ct missing version prefix: {email_ct[:20]}...")
            problems += 1
            continue
        decrypted = encryption_service.decrypt(email_ct)
        if decrypted != email:
            _fail(
                f"user {user_id}: email_ct decrypts to {decrypted!r}, "
                f"expected {email!r}"
            )
            problems += 1
            continue
        expected_hash = compute_lookup_hash(email)
        if lookup_hash != expected_hash:
            _fail(
                f"user {user_id}: email_lookup_hash mismatch "
                f"(stored={lookup_hash!r} expected={expected_hash!r})"
            )
            problems += 1

    if problems:
        _fail(f"{problems}/{len(rows)} sampled users failed encryption checks.")
        return False

    _ok(f"DB sample OK: {len(rows)} users have matching email_ct and email_lookup_hash")
    return True


async def main() -> int:
    parser = argparse.ArgumentParser(description="Verify encryption system wiring.")
    parser.add_argument(
        "--sample",
        type=int,
        default=5,
        help="Number of user rows to sample for DB dual-write check (0 to skip).",
    )
    args = parser.parse_args()

    settings = get_settings()
    print(f"Environment: debug={settings.debug}, "
          f"current_version=v{settings.encryption_current_version}, "
          f"ssl_mode={settings.db_ssl_mode}")

    results = [
        check_roundtrip(),
        check_hash_consistency(),
        check_legacy_fallback(),
        await check_db_sample(args.sample),
    ]

    if all(results):
        print(f"\n{GREEN}All encryption checks passed.{RESET}")
        return 0
    print(f"\n{RED}One or more encryption checks failed.{RESET}")
    return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
