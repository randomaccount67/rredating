/**
 * Structured error class for consistent API error responses.
 * Controllers catch these and return the appropriate HTTP status.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function badRequest(message: string): AppError {
  return new AppError(400, message);
}

export function unauthorized(message = 'Not authenticated'): AppError {
  return new AppError(401, message);
}

export function forbidden(message = 'Forbidden'): AppError {
  return new AppError(403, message);
}

export function notFound(message = 'Not found'): AppError {
  return new AppError(404, message);
}

export function conflict(message: string): AppError {
  return new AppError(409, message);
}

export function tooMany(message: string): AppError {
  return new AppError(429, message);
}
