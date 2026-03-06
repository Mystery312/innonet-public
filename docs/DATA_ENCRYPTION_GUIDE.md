# Data Encryption at Rest - Implementation Guide

## Overview

This guide explains how to implement field-level encryption for sensitive data using the encryption utility at `backend/src/utils/encryption.py`.

## What to Encrypt

Encrypt personally identifiable information (PII) and sensitive data:
- **Phone numbers** ✓ High priority
- **SSN/National ID** ✓ If collected
- **Date of birth** ✓ If storing exact dates
- **Home addresses** ⚠️ Consider
- **Payment information** ❌ Use Stripe instead

**Don't encrypt:**
- Email addresses (needed for lookups, password resets)
- Usernames (public identifiers)
- Non-sensitive profile data

## Setup

### 1. Generate Encryption Key

```bash
# Generate a Fernet key (32-byte base64-encoded)
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Output example: gAAAAABhB5Y9...
```

### 2. Add to Environment

```bash
# In backend/.env
ENCRYPTION_KEY=gAAAAABhB5Y9...
```

**Security Notes:**
- Store separately from `DATABASE_URL` and `SECRET_KEY`
- In production, use a secret management service (AWS Secrets Manager, Vault)
- Rotate keys periodically (requires re-encryption of data)
- Never commit encryption keys to git

### 3. Verify Encryption is Enabled

```bash
# Check backend logs on startup
# Should see: "Encryption service initialized successfully"
# If key is missing: "ENCRYPTION_KEY not set - encryption disabled"
```

## Implementation Patterns

### Pattern 1: Using Hybrid Properties (Recommended)

For SQLAlchemy models, use hybrid properties to transparently encrypt/decrypt:

```python
from sqlalchemy import String, Column
from sqlalchemy.ext.hybrid import hybrid_property
from src.utils.encryption import encrypt_field, decrypt_field

class User(Base):
    __tablename__ = "users"

    id = Column(UUID, primary_key=True)
    username = Column(String, unique=True)  # Not encrypted
    email = Column(String, unique=True)  # Not encrypted

    # Store encrypted value in _phone column
    _phone = Column("phone", String, nullable=True)

    @hybrid_property
    def phone(self):
        """Decrypt phone when accessed."""
        return decrypt_field(self._phone)

    @phone.setter
    def phone(self, value):
        """Encrypt phone when set."""
        self._phone = encrypt_field(value)

    # Usage:
    # user.phone = "555-123-4567"  # Automatically encrypted
    # print(user.phone)  # Automatically decrypted -> "555-123-4567"
```

### Pattern 2: Manual Encryption (Service Layer)

For more control, encrypt/decrypt in service methods:

```python
from src.utils.encryption import encryption_service

class UserService:
    async def create_user(self, phone: str):
        encrypted_phone = encryption_service.encrypt(phone)

        user = User(
            username="john",
            _phone=encrypted_phone  # Store encrypted
        )
        # ...

    async def get_user_phone(self, user: User) -> str:
        return encryption_service.decrypt(user._phone)
```

### Pattern 3: Pydantic Schema Encryption

For API request/response models:

```python
from pydantic import BaseModel, field_validator
from src.utils.encryption import encrypt_field, decrypt_field

class UserCreate(BaseModel):
    username: str
    phone: str

    @field_validator('phone')
    @classmethod
    def encrypt_phone(cls, v: str) -> str:
        return encrypt_field(v)

class UserResponse(BaseModel):
    username: str
    phone: str

    @field_validator('phone', mode='before')
    @classmethod
    def decrypt_phone(cls, v: str) -> str:
        return decrypt_field(v)
```

## Migration Strategy

### For Existing Data

If you have existing unencrypted data, create a migration script:

```python
# backend/scripts/encrypt_existing_data.py
import asyncio
from sqlalchemy import select
from src.database.postgres import AsyncSessionLocal, engine
from src.auth.models import User
from src.utils.encryption import encrypt_field

async def encrypt_phone_numbers():
    """Encrypt all existing phone numbers."""
    async with AsyncSessionLocal() as session:
        # Get all users with unencrypted phone numbers
        result = await session.execute(
            select(User).where(User._phone.isnot(None))
        )
        users = result.scalars().all()

        count = 0
        for user in users:
            if user._phone and not user._phone.startswith('gAAAAA'):  # Not already encrypted
                user._phone = encrypt_field(user._phone)
                count += 1

        await session.commit()
        print(f"Encrypted {count} phone numbers")

# Run: python3 -m backend.scripts.encrypt_existing_data
if __name__ == "__main__":
    asyncio.run(encrypt_phone_numbers())
```

### Database Migration

Update the column type if needed (encrypted data is longer):

```python
# alembic/versions/xxx_encrypt_phone_numbers.py
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Increase column size to accommodate encrypted data
    op.alter_column('users', 'phone',
                    type_=sa.String(500),  # Was probably 20
                    existing_nullable=True)

def downgrade():
    op.alter_column('users', 'phone',
                    type_=sa.String(20),
                    existing_nullable=True)
```

## Performance Considerations

### 1. Query Limitations

**Cannot search on encrypted fields:**
```python
# This WON'T work (can't search encrypted data)
User.query.filter(User.phone == "555-123-4567")  # ❌

# Workaround: Search by unencrypted field (email/username)
user = User.query.filter(User.email == "user@example.com").first()  # ✓
print(user.phone)  # Decrypts when accessed
```

### 2. Indexing

Cannot index encrypted fields (values are random):
```python
# Don't do this
class User(Base):
    _phone = Column(String, index=True)  # ❌ Useless index

# Instead, index a hash if you need uniqueness
phone_hash = Column(String, index=True, unique=True)
```

### 3. Bulk Operations

Encrypt/decrypt can be CPU-intensive for large datasets:
```python
# Bad: Decrypt 10,000 records
users = User.query.limit(10000).all()
for user in users:
    print(user.phone)  # Decrypts each one

# Better: Only decrypt what you need
user = User.query.filter(User.id == user_id).first()
print(user.phone)  # Decrypt one record
```

## Security Best Practices

### 1. Key Rotation

Rotate encryption keys periodically:

```python
# 1. Generate new key
new_key = Fernet.generate_key()

# 2. Re-encrypt all data with new key
old_fernet = Fernet(old_key)
new_fernet = Fernet(new_key)

for user in users:
    plaintext = old_fernet.decrypt(user._phone)
    user._phone = new_fernet.encrypt(plaintext)

# 3. Update ENCRYPTION_KEY in environment
```

### 2. Access Logging

Log access to encrypted fields:

```python
@hybrid_property
def phone(self):
    """Decrypt phone with access logging."""
    import logging
    logging.info(f"Phone number accessed: user_id={self.id}")
    return decrypt_field(self._phone)
```

### 3. Separate Keys by Purpose

Use different keys for different types of data:

```python
PHONE_ENCRYPTION_KEY = os.getenv('PHONE_ENCRYPTION_KEY')
SSN_ENCRYPTION_KEY = os.getenv('SSN_ENCRYPTION_KEY')
```

### 4. Backup Encrypted Data

Encrypted backups are safe to store off-site (without the key):
```bash
# Backup includes encrypted data
pg_dump innonet > backup.sql

# Store backup in S3 (safe - data is encrypted)
# Store ENCRYPTION_KEY separately (NOT with backup)
```

## Testing Encryption

### Unit Tests

```python
def test_phone_encryption():
    from src.utils.encryption import encrypt_field, decrypt_field

    # Test encryption
    original = "555-123-4567"
    encrypted = encrypt_field(original)

    assert encrypted != original  # Should be different
    assert encrypted.startswith('gAAAAA')  # Fernet token prefix

    # Test decryption
    decrypted = decrypt_field(encrypted)
    assert decrypted == original

    # Test null handling
    assert encrypt_field(None) is None
    assert decrypt_field(None) is None
```

### Integration Tests

```python
async def test_user_phone_encryption():
    # Create user with phone
    user = User(username="test", phone="555-123-4567")
    session.add(user)
    await session.commit()

    # Verify stored value is encrypted
    result = await session.execute(
        select(User._phone).where(User.username == "test")
    )
    stored_phone = result.scalar_one()
    assert stored_phone.startswith('gAAAAA')  # Encrypted

    # Verify decryption works
    user = await session.get(User, user.id)
    assert user.phone == "555-123-4567"  # Decrypted
```

## Compliance

### GDPR Requirements

Encryption at rest helps meet GDPR's data protection requirements:

- ✅ **Article 32**: "Appropriate technical measures" (encryption qualifies)
- ✅ **Article 5**: "Integrity and confidentiality" (encrypted data is protected)
- ✅ **Right to erasure**: Re-keying effectively "erases" data

### HIPAA Requirements

If handling health data, encryption at rest is required:

- ✅ **164.312(a)(2)(iv)**: Encryption and decryption
- ✅ **164.312(e)(2)(ii)**: Encryption of electronic PHI

### PCI DSS Requirements

If handling payment data (use Stripe instead):

- ✅ **Requirement 3.4**: Render PAN unreadable (encryption qualifies)

## Troubleshooting

### "Encryption disabled" Warning

**Cause:** `ENCRYPTION_KEY` not set in environment

**Fix:**
```bash
# Add to backend/.env
ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
```

### "Invalid token or tampered data"

**Causes:**
- Wrong encryption key
- Data corrupted
- Database charset issues

**Fix:**
```python
# Verify key is correct
from cryptography.fernet import Fernet
f = Fernet(b'your-key-here')  # Should not raise error

# Check for corruption
SELECT phone FROM users WHERE phone IS NOT NULL;
# All should start with 'gAAAAA'
```

### Performance Issues

**Symptom:** Slow queries on encrypted fields

**Solutions:**
1. Don't search on encrypted fields (use indexed unencrypted fields)
2. Decrypt only what you need (avoid .all() on large datasets)
3. Consider caching decrypted values (carefully - security trade-off)

## Example: Encrypting User Phone Numbers

Complete example for the Innonet platform:

### 1. Update User Model

```python
# backend/src/auth/models.py
from sqlalchemy.ext.hybrid import hybrid_property
from src.utils.encryption import encrypt_field, decrypt_field

class User(Base):
    # ... existing fields ...

    _phone = Column("phone", String(500), nullable=True)  # Increased size

    @hybrid_property
    def phone(self):
        return decrypt_field(self._phone)

    @phone.setter
    def phone(self, value):
        self._phone = encrypt_field(value)
```

### 2. Create Migration

```bash
cd backend
alembic revision -m "Increase phone column size for encryption"
```

Edit the migration:
```python
def upgrade():
    op.alter_column('users', 'phone', type_=sa.String(500))

def downgrade():
    op.alter_column('users', 'phone', type_=sa.String(20))
```

Run migration:
```bash
alembic upgrade head
```

### 3. Encrypt Existing Data

```bash
python3 -m backend.scripts.encrypt_existing_data
```

### 4. Test

```python
# Create user
user = User(username="john", phone="555-123-4567")
# Phone is automatically encrypted in database

# Access phone
print(user.phone)  # "555-123-4567" (automatically decrypted)
```

---

**Implementation Status:** ✅ Utility created, ready for model integration
**Next Steps:** Apply to User.phone field, create migration, encrypt existing data
**Priority:** Medium (important for compliance, not blocking for launch)
