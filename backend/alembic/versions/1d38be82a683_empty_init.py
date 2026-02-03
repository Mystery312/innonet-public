"""Initial schema

Revision ID: 1d38be82a683
Revises:
Create Date: 2026-01-18 18:00:46.916685

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1d38be82a683'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')

    # Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('username', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('email', sa.String(255), nullable=True, unique=True, index=True),
        sa.Column('phone', sa.String(20), nullable=True, unique=True, index=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_verified', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.CheckConstraint('email IS NOT NULL OR phone IS NOT NULL', name='email_or_phone_required')
    )

    # User profiles table
    op.create_table(
        'user_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('profile_image_url', sa.String(500), nullable=True),
        sa.Column('linkedin_url', sa.String(500), nullable=True),
        sa.Column('github_url', sa.String(500), nullable=True),
        sa.Column('portfolio_url', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Refresh tokens table
    op.create_table(
        'refresh_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('token_hash', sa.String(255), nullable=False, index=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
    )

    # Events table
    op.create_table(
        'events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('event_type', sa.String(50), nullable=True),
        sa.Column('location_name', sa.String(255), nullable=True),
        sa.Column('location_address', sa.Text(), nullable=True),
        sa.Column('location_city', sa.String(100), nullable=True, index=True),
        sa.Column('location_country', sa.String(100), nullable=True),
        sa.Column('latitude', sa.Numeric(10, 8), nullable=True),
        sa.Column('longitude', sa.Numeric(11, 8), nullable=True),
        sa.Column('start_datetime', sa.DateTime(), nullable=False, index=True),
        sa.Column('end_datetime', sa.DateTime(), nullable=True),
        sa.Column('max_attendees', sa.Integer(), nullable=True),
        sa.Column('price_cents', sa.Integer(), default=0),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('is_published', sa.Boolean(), default=False),
        sa.Column('is_cancelled', sa.Boolean(), default=False),
        sa.Column('image_url', sa.String(500), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Event registrations table
    op.create_table(
        'event_registrations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('event_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('events.id', ondelete='CASCADE'), index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('ticket_code', sa.String(50), unique=True, nullable=True),
        sa.Column('payment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('payments.id'), nullable=True),
        sa.Column('registered_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('event_id', 'user_id', name='unique_event_registration')
    )

    # Payments table
    op.create_table(
        'payments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('stripe_payment_intent_id', sa.String(255), unique=True),
        sa.Column('stripe_customer_id', sa.String(255), nullable=True),
        sa.Column('amount_cents', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(3), default='usd'),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('payment_type', sa.String(50), nullable=False),
        sa.Column('reference_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('metadata', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Waitlist table
    op.create_table(
        'waitlist',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('referral_code', sa.String(20), unique=True),
        sa.Column('referred_by', sa.String(20), nullable=True),
        sa.Column('position', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Skills table
    op.create_table(
        'skills',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # User skills table
    op.create_table(
        'user_skills',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('skill_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('skills.id', ondelete='CASCADE'), index=True),
        sa.Column('proficiency_level', sa.String(20), nullable=True),
        sa.Column('years_experience', sa.Integer(), nullable=True),
        sa.Column('is_primary', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', 'skill_id', name='unique_user_skill')
    )

    # Projects table
    op.create_table(
        'projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('url', sa.String(500), nullable=True),
        sa.Column('image_url', sa.String(500), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('is_featured', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Certifications table
    op.create_table(
        'certifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('issuing_organization', sa.String(255), nullable=True),
        sa.Column('issue_date', sa.Date(), nullable=True),
        sa.Column('expiry_date', sa.Date(), nullable=True),
        sa.Column('credential_id', sa.String(255), nullable=True),
        sa.Column('credential_url', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Awards table
    op.create_table(
        'awards',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('issuer', sa.String(255), nullable=True),
        sa.Column('date_received', sa.Date(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Work experience table
    op.create_table(
        'work_experience',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('company_name', sa.String(255), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('is_current', sa.Boolean(), default=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Education table
    op.create_table(
        'education',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('institution', sa.String(255), nullable=False),
        sa.Column('degree', sa.String(255), nullable=True),
        sa.Column('field_of_study', sa.String(255), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('grade', sa.String(50), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Profile embeddings table (for AI search)
    op.create_table(
        'profile_embeddings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True),
        sa.Column('embedding', postgresql.ARRAY(sa.Float()), nullable=True),
        sa.Column('embedding_text', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Profile analysis table
    op.create_table(
        'profile_analysis',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True),
        sa.Column('profile_summary', sa.Text(), nullable=True),
        sa.Column('strengths', postgresql.JSONB(), nullable=True),
        sa.Column('improvement_areas', postgresql.JSONB(), nullable=True),
        sa.Column('career_suggestions', postgresql.JSONB(), nullable=True),
        sa.Column('skill_gaps', postgresql.JSONB(), nullable=True),
        sa.Column('analysis_date', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Connections table
    op.create_table(
        'connections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('requester_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('addressee_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint('requester_id', 'addressee_id', name='unique_connection')
    )

    # Resume uploads table
    op.create_table(
        'resume_uploads',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('file_type', sa.String(50), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('parsed_data', postgresql.JSONB(), nullable=True),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Communities table
    op.create_table(
        'communities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('cover_image_url', sa.String(500), nullable=True),
        sa.Column('icon_url', sa.String(500), nullable=True),
        sa.Column('is_private', sa.Boolean(), default=False),
        sa.Column('creator_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Community members table
    op.create_table(
        'community_members',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('community_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('communities.id', ondelete='CASCADE'), index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('role', sa.String(20), default='member'),
        sa.Column('joined_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('community_id', 'user_id', name='unique_community_member')
    )

    # Posts table
    op.create_table(
        'posts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('community_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('communities.id', ondelete='CASCADE'), index=True),
        sa.Column('author_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('title', sa.String(500), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('post_type', sa.String(20), default='discussion'),
        sa.Column('is_pinned', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Comments table
    op.create_table(
        'comments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('post_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('posts.id', ondelete='CASCADE'), index=True),
        sa.Column('author_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('parent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('comments.id', ondelete='CASCADE'), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Post votes table
    op.create_table(
        'post_votes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('post_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('posts.id', ondelete='CASCADE'), index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('vote_type', sa.Integer(), nullable=False),  # 1 for upvote, -1 for downvote
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('post_id', 'user_id', name='unique_post_vote')
    )

    # Companies table
    op.create_table(
        'companies',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('website', sa.String(500), nullable=True),
        sa.Column('logo_url', sa.String(500), nullable=True),
        sa.Column('cover_image_url', sa.String(500), nullable=True),
        sa.Column('industry', sa.String(100), nullable=True),
        sa.Column('size', sa.String(50), nullable=True),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('founded_year', sa.Integer(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), default=False),
        sa.Column('creator_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Company members table
    op.create_table(
        'company_members',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('role', sa.String(20), default='member'),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('joined_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('company_id', 'user_id', name='unique_company_member')
    )

    # Challenges table
    op.create_table(
        'challenges',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), index=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('requirements', sa.Text(), nullable=True),
        sa.Column('prize_description', sa.Text(), nullable=True),
        sa.Column('prize_amount_cents', sa.Integer(), nullable=True),
        sa.Column('deadline', sa.DateTime(), nullable=True),
        sa.Column('difficulty', sa.String(20), nullable=True),
        sa.Column('status', sa.String(20), default='draft'),
        sa.Column('max_participants', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Challenge applications table
    op.create_table(
        'challenge_applications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('challenge_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('challenges.id', ondelete='CASCADE'), index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('submission_url', sa.String(500), nullable=True),
        sa.Column('submission_notes', sa.Text(), nullable=True),
        sa.Column('applied_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('challenge_id', 'user_id', name='unique_challenge_application')
    )

    # Conversations table
    op.create_table(
        'conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('is_group', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Conversation participants table
    op.create_table(
        'conversation_participants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('joined_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('last_read_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('conversation_id', 'user_id', name='unique_conversation_participant')
    )

    # Messages table
    op.create_table(
        'messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), index=True),
        sa.Column('sender_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('message_type', sa.String(20), default='text'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('edited_at', sa.DateTime(), nullable=True),
    )

    # Notifications table
    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('reference_type', sa.String(50), nullable=True),
        sa.Column('reference_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_read', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('notifications')
    op.drop_table('messages')
    op.drop_table('conversation_participants')
    op.drop_table('conversations')
    op.drop_table('challenge_applications')
    op.drop_table('challenges')
    op.drop_table('company_members')
    op.drop_table('companies')
    op.drop_table('post_votes')
    op.drop_table('comments')
    op.drop_table('posts')
    op.drop_table('community_members')
    op.drop_table('communities')
    op.drop_table('resume_uploads')
    op.drop_table('connections')
    op.drop_table('profile_analysis')
    op.drop_table('profile_embeddings')
    op.drop_table('education')
    op.drop_table('work_experience')
    op.drop_table('awards')
    op.drop_table('certifications')
    op.drop_table('projects')
    op.drop_table('user_skills')
    op.drop_table('skills')
    op.drop_table('waitlist')
    op.drop_table('payments')
    op.drop_table('event_registrations')
    op.drop_table('events')
    op.drop_table('refresh_tokens')
    op.drop_table('user_profiles')
    op.drop_table('users')
    op.execute('DROP EXTENSION IF EXISTS vector')
