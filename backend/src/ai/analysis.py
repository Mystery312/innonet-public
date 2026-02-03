import json
import logging
from typing import Optional
from datetime import datetime, timedelta, timezone
from uuid import UUID
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.profiles.models import ProfileAnalysis
from src.profiles.service import ProfileService
from src.profiles.schemas import ProfileAnalysisResponse

logger = logging.getLogger(__name__)
settings = get_settings()


def utc_now_naive() -> datetime:
    """Return current UTC time as a naive datetime (for PostgreSQL compatibility)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AnalysisService:
    """Service for AI-powered profile analysis using GPT-4."""

    def __init__(self):
        self._client: Optional[AsyncOpenAI] = None
        self.cache_duration_hours = 24  # How long to cache analysis results

    @property
    def client(self) -> AsyncOpenAI:
        """Get or create OpenAI client."""
        if self._client is None:
            if not settings.openai_api_key:
                raise ValueError("OPENAI_API_KEY not configured")
            self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        return self._client

    async def analyze_profile(
        self,
        db: AsyncSession,
        user_id: UUID,
        force_refresh: bool = False
    ) -> ProfileAnalysisResponse:
        """
        Analyze a user's profile and return insights.

        Args:
            db: Database session
            user_id: User ID to analyze
            force_refresh: If True, bypass cache and generate new analysis
        """
        # Check cache first
        if not force_refresh:
            cached = await self._get_cached_analysis(db, user_id)
            if cached:
                return cached

        # Get full profile data
        profile_data = await ProfileService.get_full_profile(db, user_id)
        if not profile_data:
            raise ValueError("Profile not found")

        # Build profile text for analysis
        profile_text = await ProfileService.build_profile_text(db, user_id)

        if not profile_text:
            return ProfileAnalysisResponse(
                profile_score=0,
                strengths=[],
                gaps=["Profile is empty - add your skills, experience, and education"],
                recommendations=["Complete your profile to get personalized insights"],
                summary="Your profile needs more information for analysis.",
                created_at=datetime.now(timezone.utc)
            )

        # Generate analysis using GPT-4
        analysis = await self._generate_analysis(profile_text, profile_data)

        # Cache the result
        await self._save_analysis(db, user_id, analysis)

        return analysis

    async def _generate_analysis(
        self,
        profile_text: str,
        profile_data: dict
    ) -> ProfileAnalysisResponse:
        """Generate profile analysis using GPT-4."""
        system_prompt = """
You are a senior executive career advisor and industry analyst with 20+ years of experience in talent assessment. You provide brutally honest, actionable feedback that reflects real-world hiring committee standards.\n\n**MISSION:** Deconstruct the provided professional profile through multiple analytical lenses and deliver specific, investment-grade recommendations.\n\n**ANALYTICAL FRAMEWORK:**\n1. **Market Positioning:** How does this profile compete against top-tier candidates in their target industry/role?\n2. **Narrative Coherence:** Does the career trajectory tell a compelling, logical story of growth and impact?\n3. **Quantified Impact:** Are achievements expressed in measurable business outcomes (revenue, efficiency, scale)?\n4. **Skill Stack Architecture:** Do technical/soft skills form a coherent, market-relevant portfolio with clear specialization?\n5. **Differentiation:** What makes this profile uniquely valuable compared to peers?\n\n**OUTPUT REQUIREMENTS:**\nReturn analysis as JSON with this exact structure:\n{\n    \"profile_score\": <integer 0-100>,\n    \"score_breakdown\": {\n        \"experience_quality\": <integer 0-20>,\n        \"impact_quantification\": <integer 0-20>,\n        \"skill_market_fit\": <integer 0-20>,\n        \"career_narrative\": <integer 0-20>,\n        \"profile_polish\": <integer 0-20>\n    },\n    \"strengths\": [<list of 3-5 statements with specific evidence from profile>],\n    \"critical_gaps\": [<list of 2-4 gaps phrased as specific career risks>],\n    \"immediate_action_items\": [\n        {\n            \"action\": \"<specific task>\",\n            \"rationale\": \"<why this matters>\",\n            \"expected_impact\": \"<on score/employability>\"\n        }\n    ],\n    \"industry_benchmarking\": \"<How this profile compares to top 10%, median, and entry-level candidates in their target field>\",\n    \"summary\": \"<Direct, executive-style assessment with clear positioning statement>\"\n}\n\n**SCORING CALIBRATION (Industry Standards):**\n- 95-100: Executive/thought leader level (industry reference profile)\n- 90-94: Top 5% candidate (immediately hireable at competitive firms)\n- 85-89: Strong contender (needs minor optimization)\n- 80-84: Competitive with clear development areas\n- 75-79: Needs substantial work in key areas\n- Below 75: Not competitive for target roles without significant overhaul\n\n**FEEDBACK STYLE:**\n- Use specific examples from the profile to justify every point\n- Reference current hiring trends (2024+) and salary benchmarks where relevant\n- Identify both tactical fixes and strategic repositioning opportunities\n- Include \"hard truth\" observations that candid advisors would share privately\n- Balance criticism with clear pathways to improvemen
"""

        user_prompt = f"""Please analyze this professional profile:

{profile_text}

Additional context:
- Number of skills: {len(profile_data.get('skills', []))}
- Number of projects: {len(profile_data.get('projects', []))}
- Work experiences: {len(profile_data.get('work_experience', []))}
- Education entries: {len(profile_data.get('education', []))}
- Certifications: {len(profile_data.get('certifications', []))}

Provide your analysis in the specified JSON format."""

        try:
            response = await self.client.chat.completions.create(
                model=settings.openai_chat_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=1000
            )

            result_text = response.choices[0].message.content
            result = json.loads(result_text)

            return ProfileAnalysisResponse(
                profile_score=min(100, max(0, result.get("profile_score", 50))),
                strengths=result.get("strengths", []),
                gaps=result.get("gaps", []),
                recommendations=result.get("recommendations", []),
                summary=result.get("summary", "Analysis completed."),
                created_at=datetime.now(timezone.utc)
            )

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse GPT-4 response: {e}")
            raise ValueError("Failed to parse analysis response")
        except Exception as e:
            logger.error(f"GPT-4 analysis failed: {e}")
            raise

    async def _get_cached_analysis(
        self,
        db: AsyncSession,
        user_id: UUID
    ) -> Optional[ProfileAnalysisResponse]:
        """Get cached analysis if available and not expired."""
        result = await db.execute(
            select(ProfileAnalysis)
            .where(ProfileAnalysis.user_id == user_id)
            .order_by(ProfileAnalysis.created_at.desc())
            .limit(1)
        )
        cached = result.scalar_one_or_none()

        if cached and cached.expires_at and cached.expires_at > utc_now_naive():
            analysis_data = cached.analysis_data or {}
            return ProfileAnalysisResponse(
                profile_score=cached.profile_score,
                strengths=analysis_data.get("strengths", []),
                gaps=analysis_data.get("gaps", []),
                recommendations=analysis_data.get("recommendations", []),
                summary=analysis_data.get("summary", ""),
                created_at=cached.created_at
            )

        return None

    async def _save_analysis(
        self,
        db: AsyncSession,
        user_id: UUID,
        analysis: ProfileAnalysisResponse
    ) -> ProfileAnalysis:
        """Save analysis to database cache."""
        # Check if existing analysis exists
        result = await db.execute(
            select(ProfileAnalysis)
            .where(ProfileAnalysis.user_id == user_id)
            .order_by(ProfileAnalysis.created_at.desc())
            .limit(1)
        )
        existing = result.scalar_one_or_none()

        analysis_data = {
            "strengths": analysis.strengths,
            "gaps": analysis.gaps,
            "recommendations": analysis.recommendations,
            "summary": analysis.summary
        }

        if existing:
            existing.profile_score = analysis.profile_score
            existing.analysis_data = analysis_data
            existing.created_at = utc_now_naive()
            existing.expires_at = utc_now_naive() + timedelta(hours=self.cache_duration_hours)
            return existing
        else:
            new_analysis = ProfileAnalysis(
                user_id=user_id,
                profile_score=analysis.profile_score,
                analysis_data=analysis_data,
                created_at=utc_now_naive(),
                expires_at=utc_now_naive() + timedelta(hours=self.cache_duration_hours)
            )
            db.add(new_analysis)
            await db.flush()
            return new_analysis

    async def compare_profiles(
        self,
        db: AsyncSession,
        user_id_1: UUID,
        user_id_2: UUID
    ) -> dict:
        """Compare two user profiles and return insights."""
        profile1 = await ProfileService.get_full_profile(db, user_id_1)
        profile2 = await ProfileService.get_full_profile(db, user_id_2)

        if not profile1 or not profile2:
            raise ValueError("One or both profiles not found")

        profile_text_1 = await ProfileService.build_profile_text(db, user_id_1)
        profile_text_2 = await ProfileService.build_profile_text(db, user_id_2)

        system_prompt = """You are a professional networking advisor.
        Compare the two professional profiles and identify:
        1. Common skills and interests
        2. Complementary strengths
        3. Potential collaboration opportunities
        4. Networking value for each party

        Return your analysis as JSON:
        {
            "common_ground": [<list of shared skills/interests>],
            "complementary_skills": [<skills one has that other doesn't>],
            "collaboration_opportunities": [<potential ways to work together>],
            "networking_summary": "<2-3 sentence summary of networking potential>"
        }"""

        user_prompt = f"""Compare these two professional profiles:

PROFILE 1:
{profile_text_1}

PROFILE 2:
{profile_text_2}

Provide your comparison analysis in the specified JSON format."""

        try:
            response = await self.client.chat.completions.create(
                model=settings.openai_chat_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=800
            )

            result_text = response.choices[0].message.content
            return json.loads(result_text)

        except Exception as e:
            logger.error(f"Profile comparison failed: {e}")
            raise

    async def get_skill_recommendations(
        self,
        db: AsyncSession,
        user_id: UUID,
        limit: int = 5
    ) -> list[dict]:
        """Get AI-powered skill recommendations for a user."""
        profile_text = await ProfileService.build_profile_text(db, user_id)

        if not profile_text:
            return []

        system_prompt = """You are a career development advisor.
        Based on the user's current skills and experience, recommend skills they should learn.
        Focus on skills that would complement their existing expertise and improve their career prospects.

        Return as JSON:
        {
            "recommendations": [
                {
                    "skill": "<skill name>",
                    "reason": "<why this skill is recommended>",
                    "priority": "<high/medium/low>"
                }
            ]
        }"""

        user_prompt = f"""Based on this professional profile, recommend {limit} skills to learn:

{profile_text}

Provide your recommendations in the specified JSON format."""

        try:
            response = await self.client.chat.completions.create(
                model=settings.openai_chat_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=600
            )

            result_text = response.choices[0].message.content
            result = json.loads(result_text)
            return result.get("recommendations", [])[:limit]

        except Exception as e:
            logger.error(f"Skill recommendations failed: {e}")
            return []


# Singleton instance
analysis_service = AnalysisService()


def get_analysis_service() -> AnalysisService:
    """Get analysis service instance."""
    return analysis_service
