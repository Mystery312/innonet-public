"""
ORM-Level Encryption Tests.

These tests go through the SQLAlchemy ORM session to prove that the
TypeDecorators (EncryptedString, EncryptedText, EncryptedJSON) work
end-to-end: plaintext is encrypted on write and decrypted on read,
and the raw database column stores Fernet ciphertext.
"""
import uuid
import pytest
from sqlalchemy import select, text

from src.auth.models import User, UserProfile
from src.auth.utils import hash_password
from src.utils.encryption import encryption_service, compute_lookup_hash


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _unique_username() -> str:
    return f"testuser_{uuid.uuid4().hex[:8]}"


def _unique_email() -> str:
    return f"test_{uuid.uuid4().hex[:8]}@example.com"


async def _create_user(db_session, email: str | None = None, username: str | None = None) -> User:
    """Create and persist a User directly through the ORM session."""
    uname = username or _unique_username()
    em = email or _unique_email()
    user = User(
        username=uname,
        email=em,
        email_lookup_hash=compute_lookup_hash(em),
        password_hash=hash_password("TestPassword1!"),
    )
    db_session.add(user)
    await db_session.flush()  # get the ID without committing the outer transaction

    profile = UserProfile(user_id=user.id)
    db_session.add(profile)
    await db_session.flush()

    return user


# ---------------------------------------------------------------------------
# Test 1: email is stored as ciphertext at the DB layer
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_user_email_encrypted_at_rest(db_session):
    """Raw DB value for the email column must be a Fernet-versioned ciphertext."""
    user = await _create_user(db_session)
    user_id = user.id

    # Read the raw value directly from PostgreSQL — bypasses the ORM TypeDecorator.
    result = await db_session.execute(
        text("SELECT email FROM users WHERE id = :id"),
        {"id": str(user_id)},
    )
    raw_email = result.scalar_one()

    assert raw_email is not None, "email column must not be NULL"
    assert raw_email.startswith("v1:"), (
        f"email column must contain Fernet ciphertext (v1:<token>), got: {raw_email!r}"
    )


# ---------------------------------------------------------------------------
# Test 2: ORM read decrypts the email back to plaintext
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_user_email_decrypts_correctly(db_session):
    """After ORM round-trip, user.email must equal the original plaintext."""
    original_email = _unique_email()
    user = await _create_user(db_session, email=original_email)
    user_id = user.id

    # Re-read via ORM (TypeDecorator decrypts on process_result_value).
    result = await db_session.execute(
        select(User).where(User.id == user_id)
    )
    fetched_user = result.scalar_one()

    assert fetched_user.email == original_email, (
        f"Decrypted email should equal original. Got: {fetched_user.email!r}"
    )


# ---------------------------------------------------------------------------
# Test 3: lookup hash is a 64-char hex string
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_lookup_hash_set_on_write(db_session):
    """email_lookup_hash must be set and be a valid 64-char hex string."""
    email = _unique_email()
    user = await _create_user(db_session, email=email)

    assert user.email_lookup_hash is not None, "email_lookup_hash must not be None"
    assert len(user.email_lookup_hash) == 64, (
        f"HMAC-SHA256 hex digest must be 64 chars, got {len(user.email_lookup_hash)}"
    )
    # Must be valid lowercase hex.
    int(user.email_lookup_hash, 16)  # raises ValueError if not hex


# ---------------------------------------------------------------------------
# Test 4: UserProfile PII fields are encrypted at rest
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_user_profile_fields_encrypted(db_session):
    """full_name, bio, and location in user_profiles must be Fernet ciphertext."""
    user = await _create_user(db_session)

    # Set profile PII through ORM (TypeDecorator encrypts on process_bind_param).
    profile = user.profile if user.profile else UserProfile(user_id=user.id)
    profile.full_name = "Alice Smith"
    profile.bio = "Software engineer who loves open source."
    profile.location = "San Francisco, CA"
    db_session.add(profile)
    await db_session.flush()

    profile_id = profile.id

    # Read raw column values from PostgreSQL.
    result = await db_session.execute(
        text(
            "SELECT full_name, bio, location "
            "FROM user_profiles WHERE id = :id"
        ),
        {"id": str(profile_id)},
    )
    row = result.one()
    raw_full_name, raw_bio, raw_location = row

    for col_name, raw_value in [
        ("full_name", raw_full_name),
        ("bio", raw_bio),
        ("location", raw_location),
    ]:
        assert raw_value is not None, f"{col_name} must not be NULL after write"
        assert raw_value.startswith("v1:"), (
            f"{col_name} must be Fernet ciphertext, got: {raw_value!r}"
        )


# ---------------------------------------------------------------------------
# Test 5: EncryptedJSON round-trip via ResumeUpload
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_encrypted_json_roundtrip(db_session):
    """ResumeUpload.parsed_data must be ciphertext at rest and dict on ORM read."""
    try:
        from src.profiles.models import ResumeUpload
    except ImportError:
        pytest.skip("ResumeUpload model not importable")

    user = await _create_user(db_session)

    original_data = {"name": "Test User", "skills": ["Python", "FastAPI"]}
    resume = ResumeUpload(
        user_id=user.id,
        filename="resume.pdf",
        file_type="pdf",
        file_size=12345,
        parsed_data=original_data,
        status="completed",
    )
    db_session.add(resume)
    await db_session.flush()

    resume_id = resume.id

    # Raw DB value must be ciphertext.
    result = await db_session.execute(
        text("SELECT parsed_data FROM resume_uploads WHERE id = :id"),
        {"id": str(resume_id)},
    )
    raw_value = result.scalar_one()

    assert raw_value is not None, "parsed_data must not be NULL"
    assert raw_value.startswith("v1:"), (
        f"parsed_data must be Fernet ciphertext, got: {raw_value!r}"
    )

    # ORM read must give back the original dict.
    result2 = await db_session.execute(
        select(ResumeUpload).where(ResumeUpload.id == resume_id)
    )
    fetched = result2.scalar_one()

    assert fetched.parsed_data == original_data, (
        f"Decrypted parsed_data must equal original. Got: {fetched.parsed_data!r}"
    )


# ---------------------------------------------------------------------------
# Test 6: Same plaintext produces different ciphertexts each time (random IV)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_different_encryptions_for_same_value(db_session):
    """Fernet uses a random IV, so two encryptions of the same value must differ."""
    value = "user@example.com"

    ct1 = encryption_service.encrypt(value)
    ct2 = encryption_service.encrypt(value)

    assert ct1 is not None
    assert ct2 is not None
    assert ct1 != ct2, (
        "Two encryptions of the same plaintext must produce different ciphertexts "
        "(Fernet uses a random IV per encryption)"
    )
    # Both must still decrypt to the original value.
    assert encryption_service.decrypt(ct1) == value
    assert encryption_service.decrypt(ct2) == value


# ---------------------------------------------------------------------------
# Test 7: lookup hash is case-insensitive (normalized before hashing)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_lookup_hash_case_insensitive_match(db_session):
    """compute_lookup_hash must normalize input so casing produces the same hash."""
    hash_upper = compute_lookup_hash("User@EXAMPLE.com")
    hash_lower = compute_lookup_hash("user@example.com")
    hash_mixed = compute_lookup_hash("  User@Example.COM  ")  # also strips whitespace

    assert hash_upper is not None
    assert hash_lower is not None
    assert hash_mixed is not None
    assert hash_upper == hash_lower, (
        "Lookup hashes must match regardless of email casing"
    )
    assert hash_upper == hash_mixed, (
        "Lookup hashes must match after stripping whitespace and normalizing case"
    )
