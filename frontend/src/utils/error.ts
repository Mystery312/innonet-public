import { AxiosError } from 'axios';

interface ApiErrorResponse {
  detail?: string | { msg: string; type: string; loc?: string[] }[] | Record<string, unknown>;
  message?: string;
}

/**
 * Formats an error for display, extracting detailed information for debugging.
 * Shows the full error chain including status codes, validation errors, and stack traces.
 */
export function formatError(error: unknown): string {
  // Handle Axios errors (API calls)
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    const data = error.response?.data as ApiErrorResponse | undefined;

    let message = '';

    // Add status code
    if (status) {
      message += `[${status}${statusText ? ` ${statusText}` : ''}] `;
    }

    // Extract detail from response
    if (data?.detail) {
      if (typeof data.detail === 'string') {
        message += data.detail;
      } else if (Array.isArray(data.detail)) {
        // Pydantic validation errors
        const errors = data.detail.map((err) => {
          const location = err.loc ? err.loc.join('.') : 'unknown';
          return `${location}: ${err.msg} (${err.type})`;
        });
        message += `Validation errors:\n${errors.join('\n')}`;
      } else if (typeof data.detail === 'object') {
        message += JSON.stringify(data.detail, null, 2);
      }
    } else if (data?.message) {
      message += data.message;
    } else if (error.message) {
      message += error.message;
    }

    // Add request info for debugging
    if (error.config) {
      const method = error.config.method?.toUpperCase() || 'UNKNOWN';
      const url = error.config.url || 'unknown URL';
      message += `\n\nRequest: ${method} ${url}`;

      // Add request body for POST/PUT/PATCH (sanitized)
      if (['POST', 'PUT', 'PATCH'].includes(method) && error.config.data) {
        try {
          const body = typeof error.config.data === 'string'
            ? JSON.parse(error.config.data)
            : error.config.data;
          // Remove sensitive fields
          const sanitized = { ...body };
          delete sanitized.password;
          delete sanitized.token;
          delete sanitized.access_token;
          delete sanitized.refresh_token;
          message += `\nBody: ${JSON.stringify(sanitized, null, 2)}`;
        } catch {
          // Ignore JSON parse errors
        }
      }
    }

    return message || 'Unknown API error';
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    let message = error.message;

    // Add error name if it's not just "Error"
    if (error.name && error.name !== 'Error') {
      message = `[${error.name}] ${message}`;
    }

    // Add stack trace in development
    if (import.meta.env.DEV && error.stack) {
      const stackLines = error.stack.split('\n').slice(1, 4).join('\n');
      message += `\n\nStack trace:\n${stackLines}`;
    }

    return message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle objects with message property
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }

  // Fallback: stringify the error
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return 'Unknown error occurred';
  }
}

/**
 * Type guard to check if error is an AxiosError
 */
function isAxiosError(error: unknown): error is AxiosError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}

/**
 * Extracts a simple error message suitable for user display (non-technical)
 */
export function getSimpleErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as ApiErrorResponse | undefined;

    // Handle common HTTP status codes with user-friendly messages
    switch (status) {
      case 400:
        if (data?.detail && typeof data.detail === 'string') {
          return data.detail;
        }
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Please log in to continue.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return data?.detail && typeof data.detail === 'string'
          ? data.detail
          : 'This action conflicts with existing data.';
      case 422:
        return 'Invalid data provided. Please check your input.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        if (data?.detail && typeof data.detail === 'string') {
          return data.detail;
        }
        return 'An error occurred. Please try again.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred.';
}
