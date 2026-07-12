"""
Pydantic schemas for the users module.

UserDataExport is the full GDPR-style data export payload.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any
from pydantic import BaseModel


class UserDataExport(BaseModel):
    exported_at: datetime
    format_version: str = "1.0"

    # Core account info
    user: dict[str, Any]  # id, username, email, phone, created_at

    # Profile PII
    profile: dict[str, Any]  # full_name, bio, location, image/social urls

    # Profile sub-sections
    skills: list[dict[str, Any]]         # name, proficiency_level, years_experience, is_primary
    work_experience: list[dict[str, Any]] # company_name, job_title, location, start_date, end_date, description
    projects: list[dict[str, Any]]        # title, description, role, url, technologies, start_date, end_date
    certifications: list[dict[str, Any]]  # name, issuing_organization, issue_date, expiry_date
    awards: list[dict[str, Any]]          # title, issuer, date_received, description

    # Social graph
    connections: list[dict[str, Any]]    # username, full_name, connected_at

    # Platform participation
    events_rsvped: list[dict[str, Any]]  # event name, start_datetime, status
    communities_joined: list[dict[str, Any]]  # name, joined_at
