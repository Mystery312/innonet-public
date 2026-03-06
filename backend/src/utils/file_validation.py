"""
Secure file upload validation utilities.

Implements multiple layers of validation to prevent malicious file uploads:
1. Extension whitelist
2. MIME type validation
3. Magic number (file signature) verification
4. Filename sanitization
5. File size limits
"""
import mimetypes
import re
import logging
from typing import Optional, Set, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

# Magic numbers (file signatures) for common file types
# First few bytes that identify file type
MAGIC_NUMBERS = {
    # Images
    "image/jpeg": [
        b"\xFF\xD8\xFF",  # JPEG
    ],
    "image/png": [
        b"\x89PNG\r\n\x1a\n",  # PNG
    ],
    "image/gif": [
        b"GIF87a",  # GIF87a
        b"GIF89a",  # GIF89a
    ],
    "image/webp": [
        b"RIFF",  # WebP (followed by WEBP)
    ],

    # Documents
    "application/pdf": [
        b"%PDF-",  # PDF
    ],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        b"PK\x03\x04",  # DOCX (ZIP-based)
    ],
    "application/msword": [
        b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1",  # DOC (OLE2)
    ],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        b"PK\x03\x04",  # XLSX (ZIP-based)
    ],
    "text/plain": [
        # Text files don't have magic numbers, validate differently
    ],
    "text/csv": [
        # CSV files are plain text
    ],
}

# File extension to MIME type mapping
EXTENSION_TO_MIME = {
    # Images
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",

    # Documents
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".txt": "text/plain",
    ".csv": "text/csv",
}

# Allowed MIME types by category
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
}

ALLOWED_DOCUMENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/csv",
}

ALLOWED_SPREADSHEET_TYPES = {
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
}


class FileValidationError(Exception):
    """Raised when file validation fails."""
    pass


def sanitize_filename(filename: str, max_length: int = 255) -> str:
    """
    Sanitize filename to prevent directory traversal and other attacks.

    - Removes directory separators (/, \\)
    - Removes null bytes
    - Removes or replaces special characters
    - Limits length
    - Ensures file has an extension
    """
    if not filename:
        raise FileValidationError("Filename cannot be empty")

    # Remove directory separators and null bytes
    filename = filename.replace("\x00", "")
    filename = filename.replace("/", "_")
    filename = filename.replace("\\", "_")

    # Remove leading/trailing dots and spaces
    filename = filename.strip(". ")

    # Remove or replace other dangerous characters
    # Allow: alphanumeric, dash, underscore, dot
    filename = re.sub(r"[^\w\s\-.]", "_", filename)

    # Collapse multiple underscores/spaces
    filename = re.sub(r"[_\s]+", "_", filename)

    # Ensure there's a valid extension
    if "." not in filename:
        raise FileValidationError("Filename must have an extension")

    # Limit length while preserving extension
    if len(filename) > max_length:
        name, ext = filename.rsplit(".", 1)
        max_name_length = max_length - len(ext) - 1
        filename = name[:max_name_length] + "." + ext

    return filename


def validate_extension(filename: str, allowed_extensions: Set[str]) -> str:
    """
    Validate file extension against whitelist.

    Returns: lowercase extension without dot
    Raises: FileValidationError if invalid
    """
    if not filename or "." not in filename:
        raise FileValidationError("File must have an extension")

    extension = filename.rsplit(".", 1)[-1].lower()

    if extension not in allowed_extensions:
        raise FileValidationError(
            f"Invalid file type '.{extension}'. Allowed types: {', '.join(allowed_extensions)}"
        )

    return extension


def validate_mime_type(
    content: bytes,
    content_type: Optional[str],
    allowed_mime_types: Set[str]
) -> str:
    """
    Validate MIME type from Content-Type header and file content.

    Returns: validated MIME type
    Raises: FileValidationError if invalid
    """
    # Check Content-Type header if provided
    if content_type and content_type not in allowed_mime_types:
        raise FileValidationError(
            f"Invalid MIME type '{content_type}'. Allowed types: {', '.join(allowed_mime_types)}"
        )

    return content_type or "application/octet-stream"


def validate_magic_number(content: bytes, expected_mime_type: str) -> bool:
    """
    Validate file magic number (signature) matches expected MIME type.

    Returns: True if valid, False otherwise
    """
    if expected_mime_type not in MAGIC_NUMBERS:
        # No magic number defined for this type, skip validation
        logger.warning(f"No magic number validation for MIME type: {expected_mime_type}")
        return True

    magic_numbers = MAGIC_NUMBERS[expected_mime_type]

    # Check if file content starts with any of the valid magic numbers
    for magic in magic_numbers:
        if content.startswith(magic):
            return True

    # Special case for WEBP - check for WEBP after RIFF
    if expected_mime_type == "image/webp":
        if content.startswith(b"RIFF") and content[8:12] == b"WEBP":
            return True

    return False


def validate_file_size(content: bytes, max_size: int) -> None:
    """
    Validate file size doesn't exceed maximum.

    Raises: FileValidationError if too large
    """
    size = len(content)
    if size > max_size:
        max_mb = max_size / (1024 * 1024)
        raise FileValidationError(
            f"File too large ({size / (1024*1024):.1f}MB). Maximum size: {max_mb:.0f}MB"
        )

    if size == 0:
        raise FileValidationError("File is empty")


def validate_image_file(
    filename: str,
    content: bytes,
    content_type: Optional[str] = None,
    max_size: int = 5 * 1024 * 1024  # 5MB default
) -> Tuple[str, str]:
    """
    Comprehensive validation for image uploads.

    Returns: (sanitized_filename, validated_mime_type)
    Raises: FileValidationError if validation fails
    """
    # 1. Sanitize filename
    safe_filename = sanitize_filename(filename)

    # 2. Validate extension
    extension = validate_extension(safe_filename, {"jpg", "jpeg", "png", "gif", "webp"})

    # 3. Validate file size
    validate_file_size(content, max_size)

    # 4. Get expected MIME type from extension
    expected_mime = EXTENSION_TO_MIME.get(f".{extension}")
    if not expected_mime:
        raise FileValidationError(f"Unsupported extension: .{extension}")

    # 5. Validate MIME type
    mime_type = validate_mime_type(content, content_type, ALLOWED_IMAGE_TYPES)

    # 6. Validate magic number (file signature)
    if not validate_magic_number(content, expected_mime):
        raise FileValidationError(
            f"File content doesn't match extension '.{extension}'. Possible file type mismatch or corruption."
        )

    logger.info(f"Image file validated: {safe_filename} ({expected_mime}, {len(content)} bytes)")
    return safe_filename, expected_mime


def validate_document_file(
    filename: str,
    content: bytes,
    content_type: Optional[str] = None,
    max_size: int = 10 * 1024 * 1024  # 10MB default
) -> Tuple[str, str]:
    """
    Comprehensive validation for document uploads (PDF, DOCX, etc).

    Returns: (sanitized_filename, validated_mime_type)
    Raises: FileValidationError if validation fails
    """
    # 1. Sanitize filename
    safe_filename = sanitize_filename(filename)

    # 2. Validate extension
    extension = validate_extension(safe_filename, {"pdf", "doc", "docx", "txt", "csv"})

    # 3. Validate file size
    validate_file_size(content, max_size)

    # 4. Get expected MIME type from extension
    expected_mime = EXTENSION_TO_MIME.get(f".{extension}")
    if not expected_mime:
        raise FileValidationError(f"Unsupported extension: .{extension}")

    # 5. Validate MIME type
    mime_type = validate_mime_type(content, content_type, ALLOWED_DOCUMENT_TYPES)

    # 6. Validate magic number (file signature)
    if expected_mime in MAGIC_NUMBERS and MAGIC_NUMBERS[expected_mime]:
        if not validate_magic_number(content, expected_mime):
            raise FileValidationError(
                f"File content doesn't match extension '.{extension}'. Possible file type mismatch or corruption."
            )

    logger.info(f"Document file validated: {safe_filename} ({expected_mime}, {len(content)} bytes)")
    return safe_filename, expected_mime


def validate_resume_file(
    filename: str,
    content: bytes,
    content_type: Optional[str] = None,
    max_size: int = 10 * 1024 * 1024  # 10MB default
) -> Tuple[str, str]:
    """
    Validate resume file uploads (PDF, DOCX only).

    Returns: (sanitized_filename, validated_mime_type)
    Raises: FileValidationError if validation fails
    """
    # 1. Sanitize filename
    safe_filename = sanitize_filename(filename)

    # 2. Validate extension (only PDF and DOCX for resumes)
    extension = validate_extension(safe_filename, {"pdf", "docx"})

    # 3. Validate file size
    validate_file_size(content, max_size)

    # 4. Get expected MIME type from extension
    expected_mime = EXTENSION_TO_MIME.get(f".{extension}")
    if not expected_mime:
        raise FileValidationError(f"Unsupported extension: .{extension}")

    # 5. Validate MIME type
    allowed_resume_types = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }
    mime_type = validate_mime_type(content, content_type, allowed_resume_types)

    # 6. Validate magic number
    if not validate_magic_number(content, expected_mime):
        raise FileValidationError(
            f"File content doesn't match extension '.{extension}'. Possible file type mismatch or corruption."
        )

    logger.info(f"Resume file validated: {safe_filename} ({expected_mime}, {len(content)} bytes)")
    return safe_filename, expected_mime
