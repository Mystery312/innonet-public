import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows basic formatting tags but strips dangerous content.
 */
export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
};

/**
 * Strip all HTML tags and return plain text.
 * Useful for user inputs that should not contain any HTML.
 */
export const stripHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};

/**
 * Sanitize user input for display in text contexts.
 * Escapes HTML entities to prevent XSS.
 */
export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Sanitize URL to prevent javascript: and data: protocols.
 * Only allows http:, https:, and mailto: protocols.
 */
export const sanitizeUrl = (url: string): string => {
  const urlObj = new URL(url, window.location.origin);
  const allowedProtocols = ['http:', 'https:', 'mailto:'];

  if (!allowedProtocols.includes(urlObj.protocol)) {
    return '#';
  }

  return urlObj.toString();
};

/**
 * Validate and sanitize email address.
 */
export const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};
