"""Add encryption columns (Phase 1 dual-write)

Adds ciphertext companion columns (``*_ct``) and deterministic HMAC lookup-hash
columns (``*_lookup_hash``) alongside existing plaintext columns for every
sensitive PII / confidential field. Backfills existing rows by encrypting the
current plaintext in place.

This is Phase 1 of a two-phase rollout:
  * Phase 1 (this migration): dual-write infrastructure. Application reads
    continue from plaintext columns; ciphertext columns are populated for
    every new write.
  * Phase 2 (future migration): switch reads to ciphertext, then drop
    plaintext columns.

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-05 12:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# Revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ---------------------------------------------------------------------------
# Schema: columns to add. Each entry: (table, column, type, length)
# ``length`` is None for Text columns.
# ---------------------------------------------------------------------------
CIPHERTEXT_COLUMNS = [
    # (table, column, type_name, string_length)
    ("users", "email_ct", "String", 500),
    ("users", "phone_ct", "String", 500),
    ("user_profiles", "full_name_ct", "String", 500),
    ("user_profiles", "bio_ct", "Text", None),
    ("user_profiles", "location_ct", "String", 500),
    ("messages", "content_ct", "Text", None),
    ("notifications", "message_ct", "Text", None),
    ("resume_uploads", "raw_text_ct", "Text", None),
    ("resume_uploads", "parsed_data_ct", "Text", None),
    ("connections", "message_ct", "Text", None),
    ("challenge_applications", "cover_letter_ct", "Text", None),
    ("challenge_applications", "reviewer_notes_ct", "Text", None),
    ("waitlist", "email_ct", "String", 500),
]

LOOKUP_HASH_COLUMNS = [
    # (table, column, unique_index_name)
    ("users", "email_lookup_hash", "ix_users_email_lookup_hash"),
    ("users", "phone_lookup_hash", "ix_users_phone_lookup_hash"),
    ("waitlist", "email_lookup_hash", "ix_waitlist_email_lookup_hash"),
]


# ---------------------------------------------------------------------------
# Backfill: (table, source_col, ciphertext_col, lookup_hash_col_or_None)
# ---------------------------------------------------------------------------
BACKFILL_TARGETS = [
    ("users", "email", "email_ct", "email_lookup_hash"),
    ("users", "phone", "phone_ct", "phone_lookup_hash"),
    ("user_profiles", "full_name", "full_name_ct", None),
    ("user_profiles", "bio", "bio_ct", None),
    ("user_profiles", "location", "location_ct", None),
    ("messages", "content", "content_ct", None),
    ("notifications", "message", "message_ct", None),
    ("resume_uploads", "raw_text", "raw_text_ct", None),
    # parsed_data is JSONB - serialised separately
    ("connections", "message", "message_ct", None),
    ("challenge_applications", "cover_letter", "cover_letter_ct", None),
    ("challenge_applications", "reviewer_notes", "reviewer_notes_ct", None),
    ("waitlist", "email", "email_ct", "email_lookup_hash"),
]

BATCH_SIZE = 500


def _make_column(type_name: str, length):
    if type_name == "Text":
        return sa.Text()
    if type_name == "String":
        return sa.String(length=length)
    raise ValueError(f"Unknown type: {type_name}")


def upgrade() -> None:
    # 1. Add ciphertext columns.
    for table, column, type_name, length in CIPHERTEXT_COLUMNS:
        op.add_column(
            table,
            sa.Column(column, _make_column(type_name, length), nullable=True),
        )

    # 2. Add lookup-hash columns + unique indexes.
    for table, column, index_name in LOOKUP_HASH_COLUMNS:
        op.add_column(
            table, sa.Column(column, sa.String(length=64), nullable=True)
        )
        op.create_index(index_name, table, [column], unique=True)

    # 3. Backfill existing rows.
    # Late-import so Alembic can discover this migration without a running app.
    from src.utils.encryption import encryption_service

    if not encryption_service.is_enabled():
        print(
            "[c3d4e5f6a7b8] WARNING: ENCRYPTION_KEY not configured - skipping "
            "backfill. Run `alembic upgrade head` again after provisioning "
            "keys, or invoke backend/scripts/verify_encryption.py --backfill."
        )
        return

    conn = op.get_bind()
    import json as _json

    def _backfill_simple(table: str, src: str, ct: str, hash_col):
        result = conn.execute(
            sa.text(f"SELECT id, {src} FROM {table} WHERE {src} IS NOT NULL")
        )
        rows = result.fetchall()
        total = len(rows)
        if total == 0:
            return
        print(f"[c3d4e5f6a7b8] Backfilling {total} rows in {table}.{src} -> {ct}")
        for i in range(0, total, BATCH_SIZE):
            batch = rows[i : i + BATCH_SIZE]
            for row in batch:
                row_id = row[0]
                plaintext = row[1]
                ct_value = encryption_service.encrypt(plaintext)
                params = {"ct": ct_value, "id": row_id}
                set_clauses = [f"{ct} = :ct"]
                if hash_col:
                    params["h"] = encryption_service.compute_lookup_hash(plaintext)
                    set_clauses.append(f"{hash_col} = :h")
                conn.execute(
                    sa.text(
                        f"UPDATE {table} SET {', '.join(set_clauses)} WHERE id = :id"
                    ),
                    params,
                )

    for table, src, ct, hash_col in BACKFILL_TARGETS:
        _backfill_simple(table, src, ct, hash_col)

    # Special-case: JSONB parsed_data -> text-encrypted parsed_data_ct.
    result = conn.execute(
        sa.text(
            "SELECT id, parsed_data FROM resume_uploads "
            "WHERE parsed_data IS NOT NULL"
        )
    )
    rows = result.fetchall()
    if rows:
        print(
            f"[c3d4e5f6a7b8] Backfilling {len(rows)} rows in "
            "resume_uploads.parsed_data -> parsed_data_ct"
        )
        for row in rows:
            row_id, parsed = row[0], row[1]
            # asyncpg returns JSONB as dict already; psycopg2 may as well.
            if parsed is None:
                continue
            serialised = _json.dumps(parsed, default=str, separators=(",", ":"))
            ct_value = encryption_service.encrypt(serialised)
            conn.execute(
                sa.text(
                    "UPDATE resume_uploads SET parsed_data_ct = :ct WHERE id = :id"
                ),
                {"ct": ct_value, "id": row_id},
            )


def downgrade() -> None:
    # Drop lookup-hash indexes + columns.
    for table, column, index_name in reversed(LOOKUP_HASH_COLUMNS):
        op.drop_index(index_name, table_name=table)
        op.drop_column(table, column)

    # Drop ciphertext columns.
    for table, column, _type_name, _length in reversed(CIPHERTEXT_COLUMNS):
        op.drop_column(table, column)
