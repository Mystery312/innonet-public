# Security Roadmap - Innonet Platform

**Last Updated:** 2026-04-28
**Current Phase:** Phase 3 (Complete — All PII encrypted at rest)
**Status:** ✅ COMPLETE

---

## Executive Summary

Innonet has completed all three phases of field-level encryption. Every sensitive PII column is now stored exclusively as Fernet ciphertext — no plaintext columns remain. The `EncryptedString`, `EncryptedText`, and `EncryptedJSON` SQLAlchemy TypeDecorators provide transparent encrypt-on-write / decrypt-on-read at the ORM layer.

**Current Security Posture:**
- ✅ Encryption infrastructure: **COMPLETE**
- ✅ Encryption coverage: **100%** (all PII fields encrypted)
- ✅ Encryption active: **YES** (SQLAlchemy TypeDecorators — transparent encrypt-on-write / decrypt-on-read)
- ✅ Plaintext columns: **REMOVED** (Phase 3 complete 2026-04-28)

---

## Phase Overview

### Phase 1: Dual-Write Mode ✅ Complete

**Status:** COMPLETE
**Completed:** 2026-04-19

**What Was Delivered:**
- Encrypted columns (`*_ct`) created for all sensitive PII fields
- HMAC lookup hashes (`*_lookup_hash`) for all searchable fields (email, phone)
- Backfill migration for all existing data
- 100% dual-write coverage across all service methods
- Encryption keys required and validated in production config

### Phase 2: Read-Switching ✅ Complete

**Status:** COMPLETE
**Completed:** 2026-04-19

**What Was Delivered:**
- `USE_ENCRYPTED_COLUMNS` feature flag enabled at 100%
- All service layer reads switched from plaintext to `*_ct` columns
- Response schemas updated to decrypt fields from `*_ct`
- Lookup hash queries active for all email/phone lookups
- Validated: zero decryption errors in testing

### Phase 3: Plaintext Column Removal ✅ Complete

**Status:** COMPLETE
**Completed:** 2026-04-28

**What Was Delivered:**
- All plaintext columns (`email`, `phone`, `full_name`, `bio`, `location`, `content`, `message`, etc.) dropped
- All `*_ct` columns renamed to canonical names (e.g. `email_ct` → `email`)
- SQLAlchemy TypeDecorators (`EncryptedString`, `EncryptedText`, `EncryptedJSON`) provide transparent encrypt-on-write / decrypt-on-read
- Feature flag removed — no dual-write logic remains
- Alembic migration `d4e5f6a7b8c9` dynamically discovered all column pairs via `information_schema` and persisted migration state in `_phase3_migration_state` table for safe downgrade
- 14 column pairs migrated across 7 tables

---

## Resolved Security Items

All previously identified critical gaps have been resolved as part of Phase 1–3 completion.

| Item | Resolution | Completed |
|------|-----------|-----------|
| OAuthAccount.provider_email not encrypted | Encrypted via `EncryptedString` TypeDecorator; plaintext column dropped | 2026-04-28 |
| ResumeUpload.parsed_data not encrypted | Encrypted via `EncryptedJSON` TypeDecorator | 2026-04-28 |
| Encryption keys optional in production | `field_validator` enforces keys in production; format validated | 2026-04-19 |
| Phase 1 reads still use plaintext | Phase 2 switched all reads; Phase 3 dropped plaintext columns entirely | 2026-04-28 |

---

## Phase 3 Completion Checklist

### Encryption Coverage (100%) ✅

- [x] User email (EncryptedString, lookup hash index)
- [x] User phone (EncryptedString, lookup hash index)
- [x] UserProfile full_name (EncryptedString)
- [x] UserProfile bio (EncryptedText)
- [x] UserProfile location (EncryptedString)
- [x] Message content (EncryptedText)
- [x] Notification message (EncryptedText)
- [x] ResumeUpload raw_text (EncryptedText)
- [x] ResumeUpload parsed_data (EncryptedJSON)
- [x] Connection message (EncryptedText)
- [x] ChallengeApplication cover_letter (EncryptedText)
- [x] ChallengeApplication reviewer_notes (EncryptedText)
- [x] Waitlist email (EncryptedString, lookup hash index)
- [x] OAuthAccount provider_email (EncryptedString)
- [x] OAuthAccount access_token (EncryptedText)
- [x] OAuthAccount refresh_token (EncryptedText)

### Configuration & Validation ✅

- [x] Encryption keys required in production
- [x] Encryption key format validation (44-char Fernet)
- [x] Placeholder value detection
- [x] DB TLS enforcement in production
- [x] Startup security validation via `@model_validator`

### Schema Changes ✅

- [x] All plaintext columns dropped
- [x] All `*_ct` columns renamed to canonical names
- [x] Alembic migration with dynamic `information_schema` discovery
- [x] `_phase3_migration_state` table preserves downgrade metadata

---

## Implementation Summary (Complete)

All three phases are complete as of 2026-04-28. The following summarizes what was implemented.

### Phase 1 (Dual-Write) — 2026-03-15 to 2026-04-19

Added `*_ct` ciphertext columns alongside every plaintext PII column. Service layer wrote to both columns simultaneously. HMAC lookup hashes added for email/phone. Encryption keys made mandatory in production config.

### Phase 2 (Read-Switching) — 2026-04-19

Enabled `USE_ENCRYPTED_COLUMNS=true`. Response schemas and service methods switched reads to `*_ct` columns. All email/phone lookups switched to `*_lookup_hash` queries. Validated zero decryption errors.

### Phase 3 (Plaintext Removal) — 2026-04-28

Alembic migration `d4e5f6a7b8c9`:
- Dynamically discovered all `*_ct` / plaintext column pairs via `information_schema`
- Persisted original types, indexes, and constraints in `_phase3_migration_state` table for safe downgrade
- Backfilled any rows missing ciphertext
- Dropped unique indexes from plaintext columns
- Dropped plaintext columns
- Renamed `*_ct` → canonical names (e.g. `email_ct` → `email`)

Models updated to use `EncryptedString`, `EncryptedText`, `EncryptedJSON` TypeDecorators directly. All dual-write and feature-flag code removed.

---

## Security Metrics & KPIs

### Current State (Phase 3 Complete)

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Encrypted Fields Coverage | 100% | 100% | 🟢 |
| Encryption Keys Required | Yes | Yes | 🟢 |
| Reading from Encrypted Columns | Yes | Yes (TypeDecorators) | 🟢 |
| Decryption Error Rate | <0.01% | 0% (validated) | 🟢 |
| Key Rotation Capability | Yes | Yes | 🟢 |
| HMAC Lookup Hashes | 100% | 100% | 🟢 |
| Plaintext Columns Removed | 100% | 100% | 🟢 |

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

- [x] Encryption at rest for PII (TypeDecorator — Phase 3 complete)
- [x] Full encryption active (all PII in Fernet ciphertext)
- [x] Right to erasure (cascade deletes implemented)
- [x] Data minimization (only collect necessary fields)
- [ ] Data portability (export API - TODO)
- [x] Breach notification plan (Sentry + logs)

### CCPA Compliance

- [x] Data deletion on request
- [x] Privacy policy disclosure (frontend/public/privacy)
- [x] "Do Not Sell" mechanism (N/A - no data selling)
- [x] Access to personal data (profile API)

### Security Best Practices (OWASP)

- [x] A02: Cryptographic Failures - Full encryption at rest, no plaintext PII
- [x] A03: Injection - SQLAlchemy ORM + Pydantic validation
- [x] A07: Auth Failures - bcrypt + JWT + rate limiting + lockout
- [x] A05: Security Misconfiguration - Production validation enforces keys and TLS

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

### Phase 1 ✅ Complete (2026-04-19)
- ✅ All sensitive fields have encrypted columns
- ✅ Encryption keys required in production
- ✅ 100% backfill of existing data
- ✅ Security audit shows no critical gaps

### Phase 2 ✅ Complete (2026-04-19)
- ✅ All reads from encrypted columns
- ✅ 100% traffic using encryption
- ✅ Zero decryption errors in validation testing
- ✅ Lookup hash queries active for email/phone

### Phase 3 ✅ Complete (2026-04-28)
- ✅ All plaintext columns dropped
- ✅ All `*_ct` columns renamed to canonical names
- ✅ TypeDecorators provide transparent encrypt/decrypt
- ✅ Documentation updated
- ✅ Migration state persisted for safe downgrade

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

**Last Reviewed:** 2026-04-28
**Next Review:** 2026-07-01 (quarterly review)
**Document Owner:** Security Team
