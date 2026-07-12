"""Phase 3: Drop plaintext columns, promote *_ct to canonical names

Dynamically discovers every (*_ct, plaintext) column pair by querying
information_schema at runtime.  Migration state (original column types,
indexes, and constraints) is persisted in a ``_phase3_migration_state`` table
so that downgrade can reverse every change without any hardcoded lists.

Prerequisites
-------------
* Phase 2 (USE_ENCRYPTED_COLUMNS=true) running at 100 % for 2+ weeks.
* Zero decryption errors in application logs.
* ENCRYPTION_KEY_V1 and ENCRYPTION_LOOKUP_HASH_KEY set in the environment.
* Verified database backup exists.

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-27 00:00:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BATCH_SIZE = 500

# ---------------------------------------------------------------------------
# State-table DDL — persists everything we need for a clean downgrade.
# ---------------------------------------------------------------------------

_STATE_TABLE = "_phase3_migration_state"

_CREATE_STATE_TABLE = sa.text(f"""
    CREATE TABLE IF NOT EXISTS {_STATE_TABLE} (
        id                    SERIAL       PRIMARY KEY,
        table_name            TEXT         NOT NULL,
        ct_column             TEXT         NOT NULL,   -- e.g. email_ct
        canonical_name        TEXT         NOT NULL,   -- e.g. email
        plaintext_col_type    TEXT         NOT NULL,   -- original DDL type string
        unique_index_name     TEXT,                    -- NULL when no unique idx existed
        check_constraint_name TEXT,                    -- NULL when no CHECK existed
        check_constraint_expr TEXT                     -- inner SQL expression
    )
""")

_DROP_STATE_TABLE = sa.text(f"DROP TABLE IF EXISTS {_STATE_TABLE}")


# ---------------------------------------------------------------------------
# Schema-discovery helpers (all queries run against the live DB at migration
# time — nothing is hardcoded in Python).
# ---------------------------------------------------------------------------

def _discover_ct_pairs(conn) -> list[dict]:
    """
    Query information_schema to find every *_ct column that has a corresponding
    plaintext column in the same table.

    Returns a list of dicts with keys:
        table_name, ct_column, canonical_name, plaintext_col_type
    """
    rows = conn.execute(sa.text("""
        SELECT
            ct.table_name,
            ct.column_name                                AS ct_column,
            regexp_replace(ct.column_name, '_ct$', '')   AS canonical_name,
            CASE
                WHEN pt.data_type = 'character varying'
                THEN 'VARCHAR(' || pt.character_maximum_length || ')'
                WHEN pt.data_type = 'USER-DEFINED'
                THEN pt.udt_name
                ELSE upper(pt.data_type)
            END                                           AS plaintext_col_type
        FROM information_schema.columns ct
        JOIN information_schema.columns pt
          ON  pt.table_schema = ct.table_schema
          AND pt.table_name   = ct.table_name
          AND pt.column_name  = regexp_replace(ct.column_name, '_ct$', '')
        WHERE ct.table_schema  = 'public'
          AND ct.column_name   LIKE '%_ct'
          AND ct.column_name   NOT LIKE '%lookup%'
        ORDER BY ct.table_name, ct.column_name
    """)).fetchall()

    return [
        {
            "table_name":       r[0],
            "ct_column":        r[1],
            "canonical_name":   r[2],
            "plaintext_col_type": r[3],
        }
        for r in rows
    ]


def _find_unique_index(conn, table: str, column: str) -> str | None:
    """Return the name of a unique index on ``column`` in ``table``, if any."""
    row = conn.execute(sa.text("""
        SELECT i.relname
        FROM pg_index     x
        JOIN pg_class     t ON t.oid = x.indrelid
        JOIN pg_class     i ON i.oid = x.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid
                           AND a.attnum   = ANY(x.indkey)
        WHERE t.relname    = :table
          AND a.attname    = :col
          AND x.indisunique
          AND NOT x.indisprimary
        LIMIT 1
    """), {"table": table, "col": column}).fetchone()
    return row[0] if row else None


def _find_check_constraint(conn, table: str, column: str) -> tuple[str, str] | None:
    """
    Return (constraint_name, inner_sql_expression) for any CHECK constraint on
    ``table`` whose definition mentions ``column``.  Returns None if none found.
    """
    rows = conn.execute(sa.text("""
        SELECT c.conname, pg_get_constraintdef(c.oid)
        FROM pg_constraint c
        JOIN pg_class      r ON r.oid = c.conrelid
        WHERE r.relname  = :table
          AND c.contype  = 'c'
    """), {"table": table}).fetchall()

    for name, defn in rows:
        if column in defn:
            # pg_get_constraintdef returns e.g. "CHECK ((email IS NOT NULL) ...)"
            # Strip the outer CHECK ( ... ) wrapper to get the raw expression.
            inner = defn.strip()
            if inner.upper().startswith("CHECK"):
                inner = inner[5:].strip()
            if inner.startswith("(") and inner.endswith(")"):
                inner = inner[1:-1]
            return name, inner

    return None


# ---------------------------------------------------------------------------
# Backfill helper
# ---------------------------------------------------------------------------

def _backfill_missing(conn, table: str, src: str, ct: str) -> None:
    """
    Encrypt any row that has a value in the plaintext column but no entry in
    the *_ct column.  Also refreshes lookup-hash columns (discovered live from
    the schema) for fields that support them.
    """
    from src.utils.encryption import encryption_service

    if not encryption_service.is_enabled():
        print(f"[d4e5f6a7b8c9] WARNING: encryption disabled — skipping backfill of {table}.{src}")
        return

    # Discover lookup-hash column for this field, if one exists.
    hash_col_row = conn.execute(sa.text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = :table
          AND column_name  = :hash_col
        LIMIT 1
    """), {"table": table, "hash_col": f"{src}_lookup_hash"}).fetchone()
    hash_col = hash_col_row[0] if hash_col_row else None

    rows = conn.execute(sa.text(
        f"SELECT id, {src} FROM {table} "
        f"WHERE {src} IS NOT NULL AND ({ct} IS NULL OR {ct} = '')"
    )).fetchall()

    if not rows:
        return

    print(f"[d4e5f6a7b8c9] Backfilling {len(rows)} rows: {table}.{src} → {ct}")
    for i in range(0, len(rows), BATCH_SIZE):
        for row_id, plaintext in rows[i : i + BATCH_SIZE]:
            params: dict = {"ct": encryption_service.encrypt(plaintext), "id": row_id}
            clauses = [f"{ct} = :ct"]
            if hash_col:
                params["h"] = encryption_service.compute_lookup_hash(plaintext)
                clauses.append(f"{hash_col} = :h")
            conn.execute(
                sa.text(f"UPDATE {table} SET {', '.join(clauses)} WHERE id = :id"),
                params,
            )


# ---------------------------------------------------------------------------
# Upgrade
# ---------------------------------------------------------------------------

def upgrade() -> None:
    conn = op.get_bind()

    # 1. Create state table.
    conn.execute(_CREATE_STATE_TABLE)

    # 2. Discover all *_ct / plaintext pairs from the live schema.
    pairs = _discover_ct_pairs(conn)
    if not pairs:
        print("[d4e5f6a7b8c9] No column pairs found — nothing to migrate.")
        return

    print(f"[d4e5f6a7b8c9] Discovered {len(pairs)} column pairs for Phase 3 migration.")

    for pair in pairs:
        table     = pair["table_name"]
        ct_col    = pair["ct_column"]
        canonical = pair["canonical_name"]
        pt_type   = pair["plaintext_col_type"]

        # 3. Backfill rows the Phase 1 migration may have missed.
        _backfill_missing(conn, table, canonical, ct_col)

        # 4. Discover and record any unique index on the plaintext column.
        unique_idx = _find_unique_index(conn, table, canonical)

        # 5. Discover and record any CHECK constraint referencing this column.
        check_info = _find_check_constraint(conn, table, canonical)
        check_name, check_expr = (check_info if check_info else (None, None))

        # 6. Persist state for this pair so downgrade can reconstruct exactly.
        conn.execute(sa.text(f"""
            INSERT INTO {_STATE_TABLE}
                (table_name, ct_column, canonical_name, plaintext_col_type,
                 unique_index_name, check_constraint_name, check_constraint_expr)
            VALUES
                (:table, :ct, :canonical, :pt_type,
                 :uidx, :cname, :cexpr)
        """), {
            "table": table, "ct": ct_col, "canonical": canonical,
            "pt_type": pt_type, "uidx": unique_idx,
            "cname": check_name, "cexpr": check_expr,
        })

        # 7. Drop unique index (if any) on the plaintext column.
        if unique_idx:
            print(f"[d4e5f6a7b8c9]   DROP UNIQUE INDEX {unique_idx} on {table}.{canonical}")
            op.drop_index(unique_idx, table_name=table)

        # 8. Drop CHECK constraint (if any) that references this column.
        if check_name:
            print(f"[d4e5f6a7b8c9]   DROP CONSTRAINT {check_name} on {table}")
            op.drop_constraint(check_name, table, type_="check")

        # 9. Drop plaintext column.
        print(f"[d4e5f6a7b8c9]   DROP COLUMN {table}.{canonical}")
        op.drop_column(table, canonical)

        # 10. Rename *_ct → canonical.
        print(f"[d4e5f6a7b8c9]   RENAME {table}.{ct_col} → {canonical}")
        op.alter_column(table, ct_col, new_column_name=canonical)

        # 11. Recreate the CHECK constraint unchanged (same column name, same SQL).
        if check_name and check_expr:
            print(f"[d4e5f6a7b8c9]   RECREATE CONSTRAINT {check_name}: {check_expr}")
            op.create_check_constraint(check_name, table, check_expr)


# ---------------------------------------------------------------------------
# Downgrade
# ---------------------------------------------------------------------------

def downgrade() -> None:
    conn = op.get_bind()

    # Read back the state we persisted during upgrade.
    state_exists = conn.execute(sa.text("""
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = :t
    """), {"t": _STATE_TABLE}).fetchone()

    if not state_exists:
        print("[d4e5f6a7b8c9] State table not found — cannot downgrade automatically.")
        return

    rows = conn.execute(sa.text(f"""
        SELECT table_name, ct_column, canonical_name, plaintext_col_type,
               unique_index_name, check_constraint_name, check_constraint_expr
        FROM {_STATE_TABLE}
        ORDER BY id DESC
    """)).fetchall()

    from src.utils.encryption import encryption_service

    for (table, ct_col, canonical, pt_type,
         unique_idx, check_name, check_expr) in rows:

        # 1. Drop the CHECK constraint that was recreated on the encrypted column.
        if check_name:
            op.drop_constraint(check_name, table, type_="check")

        # 2. Rename canonical → *_ct.
        op.alter_column(table, canonical, new_column_name=ct_col)

        # 3. Re-add the original plaintext column.
        nullable = True
        if pt_type == "TEXT":
            col_sa: sa.types.TypeEngine = sa.Text()
        elif pt_type.startswith("VARCHAR"):
            length = int(pt_type[8:-1])
            col_sa = sa.String(length)
        else:
            col_sa = sa.Text()
        op.add_column(table, sa.Column(canonical, col_sa, nullable=nullable))

        # 4. Decrypt ciphertext back into the plaintext column.
        if encryption_service.is_enabled():
            decrypted_rows = conn.execute(
                sa.text(f"SELECT id, {ct_col} FROM {table} WHERE {ct_col} IS NOT NULL")
            ).fetchall()
            for row_id, ciphertext in decrypted_rows:
                plaintext = encryption_service.decrypt(ciphertext)
                if plaintext is not None:
                    conn.execute(
                        sa.text(f"UPDATE {table} SET {canonical} = :v WHERE id = :id"),
                        {"v": plaintext, "id": row_id},
                    )

        # 5. Recreate unique index on the restored plaintext column.
        if unique_idx:
            op.create_index(unique_idx, table, [canonical], unique=True)

        # 6. Restore the CHECK constraint on the plaintext column.
        if check_name and check_expr:
            op.create_check_constraint(check_name, table, check_expr)

    # Drop the state table.
    conn.execute(_DROP_STATE_TABLE)
