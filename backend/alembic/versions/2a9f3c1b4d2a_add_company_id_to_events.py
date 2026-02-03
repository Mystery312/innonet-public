"""Add company_id to events

Revision ID: 2a9f3c1b4d2a
Revises: 1d38be82a683
Create Date: 2026-02-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "2a9f3c1b4d2a"
down_revision: Union[str, None] = "1d38be82a683"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_events_company_id", "events", ["company_id"])


def downgrade() -> None:
    op.drop_index("ix_events_company_id", table_name="events")
    op.drop_column("events", "company_id")

