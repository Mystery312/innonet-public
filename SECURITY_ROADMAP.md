# Security Roadmap - Innonet Platform

**Last Updated:** 2026-04-18
**Current Phase:** Phase 1 (Dual-Write Mode)
**Target:** Phase 2 (Full Encryption at Rest)

---

## Executive Summary

Innonet has implemented field-level encryption infrastructure using versioned Fernet encryption with HMAC lookup hashes. Currently in **Phase 1 (dual-write mode)**: encrypted columns exist and are being populated, but the application still reads from plaintext columns.

**Current Security Posture:**
- ✅ Encryption infrastructure: **COMPLETE**
- ⚠️ Encryption coverage: **70%** (critical gaps exist)
- ❌ Encryption active: **NO** (Phase 1 writes only)
- 🎯 Target: **100% coverage + Phase 2 read-switching**

---

## Phase Overview

### Phase 1: Dual-Write Mode (Current) ✅ 70% Complete

**Status:** IN PROGRESS
**Started:** 2026-03-15
**Target Completion:** 2026-04-25

**What's Working:**
- Encrypted columns (`*_ct`) created for most sensitive fields
- HMAC lookup hashes (`*_lookup_hash`) for searchable fields
- Backfill migration for existing data
- OAuth access/refresh tokens using TypeDecorator encryption

**What's Missing:**
- OAuthAccount.provider_email not encrypted (CRITICAL)
- ResumeUpload.parsed_data not encrypted (CRITICAL)
- Encryption keys optional in production (CRITICAL)
- Some service methods still only write plaintext

**Next Steps:**
1. Encrypt remaining critical fields (see Section 3)
2. Enforce encryption keys in production
3. Complete dual-write coverage to 100%

### Phase 2: Read-Switching (Planned) 📅 2026-05-01

**Status:** NOT STARTED
**Duration:** 2-3 weeks
**Risk Level:** MEDIUM

**Goals:**
- Switch all service layer reads from `field` to `field_ct`
- Implement feature flag for gradual rollout
- Monitor decryption performance
- Validate data integrity

**Rollout Plan:**
1. Deploy with feature flag at 0% (testing only)
2. Enable for 10% of traffic → monitor for 3 days
3. Enable for 50% of traffic → monitor for 3 days
4. Enable for 100% of traffic → monitor for 1 week
5. If stable, proceed to Phase 3

### Phase 3: Plaintext Column Removal (Planned) 📅 2026-06-01

**Status:** NOT STARTED
**Duration:** 1 week
**Risk Level:** HIGH

**Goals:**
- Drop all plaintext columns (`email`, `phone`, `bio`, etc.)
- Keep only encrypted columns (`*_ct`)
- Keep lookup hashes (`*_lookup_hash`)
- Reduce database size by ~30%

**Prerequisites:**
- Phase 2 running at 100% for 2+ weeks
- Zero decryption errors in logs
- Backup verified and tested
- Rollback plan documented

---

## Critical Security Gaps

### 🔴 CRITICAL 1: OAuthAccount.provider_email Not Encrypted

**File:** `backend/src/auth/models.py:152`
**Risk:** HIGH
**Impact:** Email addresses from Google/Microsoft OAuth stored in plaintext

**Current Code:**
```python
provider_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
```

**Required Fix:**
```python
# Add encrypted columns
provider_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
provider_email_ct: Mapped[str | None] = mapped_column(String(500), nullable=True)
provider_email_lookup_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
```

**Migration Steps:**
1. Create migration to add `provider_email_ct` and `provider_email_lookup_hash`
2. Backfill existing OAuth accounts with encrypted data
3. Update `auth/oauth.py` to dual-write on new OAuth logins
4. Verify all OAuth logins populate encrypted columns

**Estimated Effort:** 2-3 hours
**Priority:** P0 - Fix immediately
**Assigned:** TBD

---

### 🔴 CRITICAL 2: ResumeUpload.parsed_data Not Encrypted

**File:** `backend/src/profiles/models.py:231-234`
**Risk:** HIGH
**Impact:** Comprehensive PII (email, phone, full name, work history) in plaintext JSONB

**Current Code:**
```python
parsed_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
parsed_data_ct: Mapped[str | None] = mapped_column(Text, nullable=True)
```

**Problem:** Dual-write columns exist but TypeDecorator not used

**Required Fix:**
```python
from src.utils.encryption import EncryptedJSON

# Replace dual-write with TypeDecorator
parsed_data: Mapped[dict | None] = mapped_column(
    EncryptedJSON,
    nullable=True,
    comment="Encrypted resume data: education, work experience, skills, contact info"
)
# Remove parsed_data_ct in Phase 3
```

**Migration Steps:**
1. Create migration to switch `parsed_data` to EncryptedJSON
2. Backfill existing resume data with encryption
3. Test resume parsing and retrieval
4. Drop `parsed_data_ct` column after Phase 2

**Estimated Effort:** 1-2 hours
**Priority:** P0 - Fix immediately
**Assigned:** TBD

---

### 🔴 CRITICAL 3: Encryption Keys Optional in Production

**File:** `backend/src/config.py:48-58`
**Risk:** MEDIUM
**Impact:** Application can start without encryption keys, writing only plaintext

**Current Code:**
```python
encryption_key_v1: Optional[str] = None
encryption_key_v2: Optional[str] = None
encryption_lookup_hash_key: Optional[str] = None
```

**Required Fix:**
```python
from pydantic import field_validator, ValidationInfo

@field_validator("encryption_key_v1")
@classmethod
def validate_encryption_key_v1(cls, v: Optional[str], info: ValidationInfo) -> Optional[str]:
    """Require encryption key in production."""
    if info.data.get("environment") == "production" and not v:
        raise ValueError(
            "ENCRYPTION_KEY_V1 is required in production. "
            "Generate with: python3 -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    if v and len(v) != 44:  # Fernet keys are 44 bytes base64
        raise ValueError("ENCRYPTION_KEY_V1 must be a valid Fernet key (44 characters)")
    return v

@field_validator("encryption_lookup_hash_key")
@classmethod
def validate_lookup_hash_key(cls, v: Optional[str], info: ValidationInfo) -> Optional[str]:
    """Require HMAC key in production."""
    if info.data.get("environment") == "production" and not v:
        raise ValueError(
            "ENCRYPTION_LOOKUP_HASH_KEY is required in production. "
            "Generate with: openssl rand -hex 32"
        )
    if v and len(v) != 64:  # HMAC keys are 32 bytes hex = 64 chars
        raise ValueError("ENCRYPTION_LOOKUP_HASH_KEY must be 64 hex characters (32 bytes)")
    return v
```

**Additional Validation:**
```python
@property
def is_production(self) -> bool:
    return self.environment == "production"

def validate_production_security(self) -> None:
    """Called during app startup to validate production config."""
    if not self.is_production:
        return

    # Check for placeholder values
    forbidden_placeholders = [
        "your-secret-key-here",
        "your-fernet-key",
        "change-me",
        "your-password-here"
    ]

    for field_name, field_value in self.model_dump().items():
        if isinstance(field_value, str):
            for placeholder in forbidden_placeholders:
                if placeholder in field_value.lower():
                    raise ValueError(
                        f"Production config contains placeholder value in {field_name.upper()}. "
                        f"Replace all placeholder values before deploying."
                    )

    # Enforce DB TLS in production
    if self.db_ssl_mode == "disable":
        raise ValueError("DB_SSL_MODE=disable is not allowed in production")

    # Enforce minimum SECRET_KEY length
    if len(self.secret_key) < 64:
        raise ValueError("SECRET_KEY must be at least 64 characters in production")
```

**Estimated Effort:** 1 hour
**Priority:** P0 - Fix immediately
**Assigned:** TBD

---

### 🔴 CRITICAL 4: Phase 1 Reads Still Use Plaintext

**Files:** Multiple service files
**Risk:** MEDIUM
**Impact:** Encryption has no effect; database breach exposes all data

**Current Behavior:**
All service methods read from plaintext columns:
```python
# auth/service.py
user = await session.execute(
    select(User).where(User.email == email)  # Reads plaintext email
)

# messaging/service.py
return MessageResponse(
    content=message.content,  # Returns plaintext content
    ...
)
```

**Required Fix (Phase 2):**
```python
# Read from plaintext in Phase 1, encrypted in Phase 2
user = await session.execute(
    select(User).where(User.email == email)  # Will use email_lookup_hash in Phase 2
)

# Response schemas should read from the active column
return MessageResponse(
    content=message.content,  # Phase 1: plaintext, Phase 2: decrypted from content_ct
    ...
)
```

**Approach:**
1. Create feature flag `USE_ENCRYPTED_COLUMNS` (default: False)
2. Update service layer to check flag and read from `*_ct` if enabled
3. Update lookup queries to use `*_lookup_hash` if enabled
4. Gradual rollout: 0% → 10% → 50% → 100%
5. Remove flag and plaintext columns in Phase 3

**Estimated Effort:** 5-7 days
**Priority:** P1 - Complete after P0 fixes
**Assigned:** TBD

---

## Phase 1 Completion Checklist

### Encryption Coverage (70% → 100%)

- [x] User email (dual-write, lookup hash)
- [x] User phone (dual-write, lookup hash)
- [x] UserProfile full_name (dual-write)
- [x] UserProfile bio (dual-write)
- [x] UserProfile location (dual-write)
- [x] Message content (dual-write)
- [x] Notification message (dual-write)
- [x] ResumeUpload raw_text (dual-write)
- [x] Connection message (dual-write)
- [x] ChallengeApplication cover_letter (dual-write)
- [x] ChallengeApplication reviewer_notes (dual-write)
- [x] Waitlist email (dual-write, lookup hash)
- [x] OAuthAccount access_token (TypeDecorator)
- [x] OAuthAccount refresh_token (TypeDecorator)
- [ ] **OAuthAccount provider_email** (MISSING - P0)
- [ ] **ResumeUpload parsed_data** (MISSING - P0)

### Configuration & Validation

- [ ] Encryption keys required in production (P0)
- [ ] Encryption key format validation (P0)
- [ ] Placeholder value detection (P0)
- [ ] DB TLS enforcement in production (P1)
- [ ] Startup security validation hook (P1)

### Testing & Verification

- [ ] All encrypted fields backfilled for existing data (P0)
- [ ] Encryption service unit tests (P1)
- [ ] Decryption performance benchmarks (P1)
- [ ] Key rotation script tested (P2)
- [ ] Disaster recovery plan documented (P1)

---

## Phase 2 Implementation Plan

### Week 1: Preparation (2026-05-01 to 2026-05-05)

**Tasks:**
1. Create feature flag system
2. Add `USE_ENCRYPTED_COLUMNS` config setting
3. Write unit tests for encrypted reads
4. Document rollback procedure

**Deliverables:**
- Feature flag implementation
- Test suite for Phase 2 reads
- Rollback runbook

### Week 2: Service Layer Updates (2026-05-06 to 2026-05-12)

**Tasks:**
1. Update all service methods to support both read modes
2. Replace exact-match queries with lookup hash queries
3. Add decryption error handling
4. Performance test with encrypted reads

**Files to Update:**
- `auth/service.py` - user lookups by email/phone
- `profiles/service.py` - profile data reads
- `messaging/service.py` - message content reads
- `network/service.py` - connection message reads
- `waitlist/service.py` - email lookups
- `companies/service.py` - challenge application reads
- `ai/resume.py` - resume data reads

**Deliverables:**
- All service methods support dual-mode reads
- Zero decryption errors in staging

### Week 3: Gradual Rollout (2026-05-13 to 2026-05-19)

**Day 1-2:** 10% traffic to encrypted reads
- Deploy with `USE_ENCRYPTED_COLUMNS=true` for 10% of requests
- Monitor decryption latency (target: <5ms overhead)
- Check error rates (target: 0 errors)

**Day 3-5:** 50% traffic to encrypted reads
- Increase to 50% if no issues at 10%
- Monitor database query performance
- Verify all encrypted columns being read

**Day 6-7:** 100% traffic to encrypted reads
- Full rollout if stable at 50%
- Lock feature flag to `true`
- Monitor for 1 week before Phase 3

**Rollback Criteria:**
- Decryption error rate > 0.01%
- Performance degradation > 20%
- Any data integrity issues

### Week 4: Validation & Monitoring (2026-05-20 to 2026-05-26)

**Tasks:**
1. Full week of monitoring at 100%
2. Validate data integrity across all tables
3. Performance benchmarking
4. Prepare Phase 3 migration plan

**Metrics to Track:**
- Decryption success rate (target: 100%)
- Average decryption latency (target: <5ms)
- Database query performance (target: <10% slower)
- Cache hit rate (target: >90%)

---

## Phase 3 Implementation Plan

### Week 1: Final Preparation (2026-06-01 to 2026-06-07)

**Prerequisites:**
- [ ] Phase 2 running at 100% for 2+ weeks
- [ ] Zero decryption errors in production
- [ ] Database backup verified and tested
- [ ] Rollback procedure tested in staging

**Tasks:**
1. Create migration to drop plaintext columns
2. Test migration in staging environment
3. Document column drops for audit trail
4. Schedule maintenance window

### Week 2: Plaintext Column Removal (2026-06-08 to 2026-06-14)

**Migration Plan:**
```sql
-- Drop plaintext columns (IRREVERSIBLE!)
ALTER TABLE users DROP COLUMN email;
ALTER TABLE users DROP COLUMN phone;
ALTER TABLE user_profiles DROP COLUMN full_name;
ALTER TABLE user_profiles DROP COLUMN bio;
ALTER TABLE user_profiles DROP COLUMN location;
ALTER TABLE messages DROP COLUMN content;
ALTER TABLE notifications DROP COLUMN message;
-- ... (continue for all encrypted fields)

-- Rename encrypted columns to canonical names
ALTER TABLE users RENAME COLUMN email_ct TO email;
ALTER TABLE users RENAME COLUMN phone_ct TO phone;
-- ... (continue for all encrypted fields)

-- Update column comments
COMMENT ON COLUMN users.email IS 'Encrypted email address (Fernet)';
COMMENT ON COLUMN users.phone IS 'Encrypted phone number (Fernet)';
-- ... (continue for all encrypted fields)
```

**Rollback Plan:**
- **Cannot rollback** - dropping columns is irreversible
- Must restore from backup if data loss occurs
- Keep backup for 90 days minimum

**Post-Migration:**
- Remove dual-write code from service layer
- Update documentation
- Celebrate 🎉 - Full encryption at rest achieved!

---

## Security Metrics & KPIs

### Current State (Phase 1)

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Encrypted Fields Coverage | 100% | 70% | 🟡 |
| Encryption Keys Required | Yes | No | 🔴 |
| Reading from Encrypted Columns | Yes | No | 🔴 |
| Decryption Error Rate | <0.01% | N/A | ⚪ |
| Key Rotation Capability | Yes | Yes | 🟢 |
| HMAC Lookup Hashes | 100% | 100% | 🟢 |

### Phase 2 Targets

| Metric | Target | Success Criteria |
|--------|--------|------------------|
| Encrypted Fields Coverage | 100% | All sensitive fields encrypted |
| Decryption Success Rate | >99.99% | <10 failures per million operations |
| Decryption Latency | <5ms p95 | <5ms overhead vs plaintext reads |
| Database Query Performance | <10% slower | Acceptable for security gain |
| Zero Downtime Migration | Yes | No service interruption |

### Phase 3 Targets

| Metric | Target | Success Criteria |
|--------|--------|------------------|
| Plaintext Columns Removed | 100% | Only encrypted columns remain |
| Database Size Reduction | 20-30% | Storage cost savings |
| Encryption Overhead | <10ms p95 | Acceptable for all operations |
| Backup & Recovery Tested | Yes | <4 hour RTO, <1 hour RPO |

---

## Dependency Audit Requirements

### Backend Dependencies

**Run monthly:**
```bash
cd backend
pip audit --fix
pip list --outdated
```

**Critical packages to monitor:**
- `cryptography` - encryption library (check for CVEs)
- `sqlalchemy` - ORM (security updates)
- `fastapi` - web framework (security patches)
- `pydantic` - validation (type safety)
- `bcrypt` - password hashing (algorithm updates)

### Frontend Dependencies

**Run monthly:**
```bash
cd frontend
npm audit fix
npm outdated
```

**Critical packages to monitor:**
- `react` - UI framework (XSS fixes)
- `axios` - HTTP client (request security)
- `vite` - build tool (build security)

---

## Compliance Checklist

### GDPR Compliance

- [x] Encryption at rest for PII (Phase 1 dual-write)
- [ ] Full encryption active (Phase 2 required)
- [x] Right to erasure (cascade deletes implemented)
- [x] Data minimization (only collect necessary fields)
- [ ] Data portability (export API - TODO)
- [x] Breach notification plan (Sentry + logs)

### CCPA Compliance

- [x] Data deletion on request
- [x] Privacy policy disclosure (frontend/public/privacy)
- [ ] "Do Not Sell" mechanism (N/A - no data selling)
- [x] Access to personal data (profile API)

### Security Best Practices (OWASP)

- [x] A02: Cryptographic Failures - Addressed with encryption
- [x] A03: Injection - SQLAlchemy prevents SQL injection
- [x] A07: Auth Failures - bcrypt + JWT + rate limiting
- [ ] A05: Security Misconfiguration - Partial (see Critical 3)

---

## Communication Plan

### Stakeholder Updates

**Weekly Status Updates:**
- Security team meeting every Monday
- Progress on Phase 1 completion
- Blockers and risks

**Phase Completion Announcements:**
- Internal announcement to engineering team
- Security audit summary for leadership
- Customer-facing security page update

### Documentation Updates

**After Phase 1 Completion:**
- Update CLAUDE.md with encryption status
- Document encryption architecture in README
- Add security badge to repository

**After Phase 2 Completion:**
- Publish blog post on encryption implementation
- Update security page: "All data encrypted at rest"
- Press release for enterprise customers

**After Phase 3 Completion:**
- Security certification updates (SOC 2, ISO 27001)
- Third-party security audit
- Customer notification of enhanced security

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Key loss/corruption | Low | Critical | Multi-region key backup, version control |
| Performance degradation | Medium | Medium | Performance testing, gradual rollout |
| Data integrity issues | Low | Critical | Extensive testing, feature flags, rollback plan |
| Migration failure | Low | High | Staging environment testing, backup verification |
| Compliance violation during transition | Medium | High | Legal review, audit trail documentation |

---

## Success Criteria

### Phase 1 Complete When:
- ✅ All sensitive fields have encrypted columns
- ✅ Encryption keys required in production
- ✅ 100% backfill of existing data
- ✅ All unit tests passing
- ✅ Security audit shows no critical gaps

### Phase 2 Complete When:
- ✅ All reads from encrypted columns
- ✅ 100% traffic using encryption
- ✅ <0.01% decryption error rate
- ✅ 1 week stable operation
- ✅ Performance within 10% of baseline

### Phase 3 Complete When:
- ✅ All plaintext columns dropped
- ✅ Database size reduced by 20-30%
- ✅ Backup and recovery tested
- ✅ Documentation updated
- ✅ Customer communication sent

---

## Contact & Escalation

**Security Team:**
- Lead: TBD
- Backup: TBD
- Escalation: CTO

**On-Call Rotation:**
- Week 1: TBD
- Week 2: TBD

**Incident Response:**
1. Detect: Sentry alerts, log monitoring
2. Assess: Severity classification (P0-P4)
3. Mitigate: Rollback or hotfix
4. Communicate: Stakeholder notification
5. Postmortem: Root cause analysis

---

**Last Reviewed:** 2026-04-18
**Next Review:** 2026-05-01 (or after Phase 1 completion)
**Document Owner:** Security Team
