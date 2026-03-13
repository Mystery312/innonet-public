"""Add discover_swipes table for discovery feature

Revision ID: a1b2c3d4e5f6
Revises: 87b8e63515d8
Create Date: 2026-03-09 20:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '87b8e63515d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create discover_swipes table
    op.create_table(
        'discover_swipes',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('target_user_id', sa.UUID(), nullable=False),
        sa.Column('action', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.CheckConstraint('user_id != target_user_id', name='no_self_swipe'),
        sa.CheckConstraint("action IN ('pass', 'connect')", name='valid_action'),
        sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'target_user_id', name='unique_swipe')
    )
    op.create_index('idx_discover_swipes_user_created', 'discover_swipes', ['user_id', 'created_at'], unique=False)
    op.create_index(op.f('ix_discover_swipes_user_id'), 'discover_swipes', ['user_id'], unique=False)
    op.create_index(op.f('ix_discover_swipes_created_at'), 'discover_swipes', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_discover_swipes_created_at'), table_name='discover_swipes')
    op.drop_index(op.f('ix_discover_swipes_user_id'), table_name='discover_swipes')
    op.drop_index('idx_discover_swipes_user_created', table_name='discover_swipes')
    op.drop_table('discover_swipes')
