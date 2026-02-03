import json
import logging
import io
from typing import Optional
from datetime import datetime, timezone
from uuid import UUID
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.profiles.models import ResumeUpload
from src.profiles.schemas import ResumeParseResult

logger = logging.getLogger(__name__)
settings = get_settings()


class ResumeParsingService:
    """Service for parsing resumes using OpenAI GPT-4."""

    def __init__(self):
        self._client: Optional[AsyncOpenAI] = None

    @property
    def client(self) -> AsyncOpenAI:
        """Get or create OpenAI client."""
        if self._client is None:
            if not settings.openai_api_key:
                raise ValueError("OPENAI_API_KEY not configured")
            self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        return self._client

    async def extract_text_from_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF file using PyPDF2."""
        try:
            import PyPDF2
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"Failed to extract text from PDF: {e}")
            raise ValueError(f"Failed to extract text from PDF: {e}")

    async def extract_text_from_docx(self, file_content: bytes) -> str:
        """Extract text from DOCX file using python-docx."""
        try:
            from docx import Document
            doc = Document(io.BytesIO(file_content))
            text = ""
            for para in doc.paragraphs:
                text += para.text + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"Failed to extract text from DOCX: {e}")
            raise ValueError(f"Failed to extract text from DOCX: {e}")

    async def parse_resume(
        self,
        db: AsyncSession,
        user_id: UUID,
        filename: str,
        file_content: bytes,
        file_type: str
    ) -> ResumeUpload:
        """
        Parse a resume file and extract structured data.

        Args:
            db: Database session
            user_id: User ID uploading the resume
            filename: Original filename
            file_content: Raw file bytes
            file_type: File extension (pdf, docx)

        Returns:
            ResumeUpload record with parsed data
        """
        # Create initial record
        resume_upload = ResumeUpload(
            user_id=user_id,
            filename=filename,
            file_type=file_type,
            file_size=len(file_content),
            status="processing"
        )
        db.add(resume_upload)
        await db.flush()

        try:
            # Extract text based on file type
            if file_type == "pdf":
                raw_text = await self.extract_text_from_pdf(file_content)
            elif file_type in ["docx", "doc"]:
                raw_text = await self.extract_text_from_docx(file_content)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")

            resume_upload.raw_text = raw_text

            if not raw_text or len(raw_text.strip()) < 50:
                raise ValueError("Could not extract sufficient text from resume")

            # Parse with GPT-4
            parsed_data = await self._parse_with_gpt(raw_text)

            resume_upload.parsed_data = parsed_data
            resume_upload.status = "completed"
            resume_upload.processed_at = datetime.now(timezone.utc)

        except Exception as e:
            logger.error(f"Resume parsing failed: {e}")
            resume_upload.status = "failed"
            resume_upload.error_message = str(e)
            resume_upload.processed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(resume_upload)
        return resume_upload

    async def _parse_with_gpt(self, resume_text: str) -> dict:
        """Use GPT-4 to parse resume text into structured data."""
        system_prompt = """You are an expert resume parser. Extract structured information from the resume text provided.

Return a JSON object with the following structure:
{
    "full_name": "string or null",
    "email": "string or null",
    "phone": "string or null",
    "location": "City, State/Country or null",
    "bio": "Brief professional summary extracted from the resume, or null",
    "linkedin_url": "string or null",
    "github_url": "string or null",
    "portfolio_url": "string or null",
    "skills": [
        {
            "name": "skill name",
            "proficiency_level": "beginner|intermediate|advanced|expert or null",
            "years_experience": number or null
        }
    ],
    "work_experience": [
        {
            "company_name": "string",
            "job_title": "string",
            "location": "string or null",
            "start_date": "YYYY-MM-DD or null",
            "end_date": "YYYY-MM-DD or null",
            "is_current": boolean,
            "description": "string or null",
            "achievements": ["achievement 1", "achievement 2"] or null
        }
    ],
    "education": [
        {
            "institution_name": "string",
            "degree_type": "bachelor|master|phd|associate|bootcamp|certificate or null",
            "field_of_study": "string or null",
            "start_date": "YYYY-MM-DD or null",
            "end_date": "YYYY-MM-DD or null",
            "gpa": number or null
        }
    ],
    "projects": [
        {
            "title": "string",
            "description": "string or null",
            "role": "string or null",
            "technologies": ["tech1", "tech2"] or null
        }
    ],
    "certifications": [
        {
            "name": "string",
            "issuing_organization": "string",
            "issue_date": "YYYY-MM-DD or null"
        }
    ]
}

Important guidelines:
1. Extract ALL skills mentioned, including technical skills, soft skills, tools, frameworks, and languages
2. For dates, use YYYY-MM-DD format. If only month/year available, use first day of month
3. For current positions, set is_current to true and end_date to null
4. Parse achievements as bullet points from job descriptions
5. If information is not available, use null instead of empty strings
6. For proficiency_level, infer from context (years of experience, "expert in", "familiar with", etc.)
7. Extract the professional summary/objective as the bio field"""

        user_prompt = f"""Parse this resume and extract all information:

{resume_text}

Return the structured JSON data."""

        try:
            response = await self.client.chat.completions.create(
                model=settings.openai_chat_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=4000
            )

            result_text = response.choices[0].message.content
            return json.loads(result_text)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse GPT response as JSON: {e}")
            raise ValueError("Failed to parse resume data")
        except Exception as e:
            logger.error(f"GPT parsing failed: {e}")
            raise

    async def get_user_resume(
        self,
        db: AsyncSession,
        user_id: UUID
    ) -> Optional[ResumeUpload]:
        """Get the most recent resume upload for a user."""
        result = await db.execute(
            select(ResumeUpload)
            .where(ResumeUpload.user_id == user_id)
            .order_by(ResumeUpload.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()


# Singleton instance
resume_service = ResumeParsingService()


def get_resume_service() -> ResumeParsingService:
    """Get resume parsing service instance."""
    return resume_service
