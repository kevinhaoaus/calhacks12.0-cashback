/**
 * Error handling utilities for API calls and async operations
 * Provides retry logic, timeouts, and user-friendly error messages
 */

/**
 * Retry a function with exponential backoff
 * Useful for transient failures like network errors or rate limits
 *
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 1000ms)
 * @param onRetry - Optional callback called before each retry
 * @returns The result of the function call
 * @throws The last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on the last attempt
      if (attempt < maxRetries - 1) {
        // Calculate exponential backoff: 1s, 2s, 4s, 8s, etc.
        const delay = baseDelay * Math.pow(2, attempt);

        // Call the onRetry callback if provided
        onRetry?.(attempt + 1, lastError);

        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed, throw the last error
  throw lastError || new Error('All retry attempts failed');
}

/**
 * Wrap a promise with a timeout
 * Rejects the promise if it doesn't complete within the specified time
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Custom error message for timeout
 * @returns The result of the promise
 * @throws Error if the promise times out
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

/**
 * Combine retry with timeout for maximum reliability
 *
 * @param fn - The async function to execute
 * @param options - Configuration options
 * @returns The result of the function call
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    timeoutMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    timeoutMs = 30000,
    onRetry
  } = options;

  return retryWithBackoff(
    () => withTimeout(fn(), timeoutMs),
    maxRetries,
    baseDelay,
    onRetry
  );
}

/**
 * Convert technical errors to user-friendly messages
 * Maps common error patterns to readable messages
 *
 * @param error - The error to convert
 * @returns A user-friendly error message
 */
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'The operation took too long. Please try again.';
    }

    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection')
    ) {
      return 'Network error. Please check your internet connection and try again.';
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'Too many requests. Please wait a moment and try again.';
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return 'Please log in to continue.';
    }

    // Not found errors
    if (message.includes('not found')) {
      return 'The requested item was not found.';
    }

    // Permission errors
    if (message.includes('permission') || message.includes('forbidden')) {
      return 'You don\'t have permission to perform this action.';
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Please check your input and try again.';
    }

    // Claude API specific errors
    if (message.includes('anthropic') || message.includes('claude')) {
      return 'AI service is temporarily unavailable. Please try again.';
    }

    // Generic fallback
    return 'Something went wrong. Please try again.';
  }

  // Unknown error type
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Check if an error is retryable
 * Some errors shouldn't be retried (e.g., validation errors)
 *
 * @param error - The error to check
 * @returns True if the error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  // Don't retry validation errors
  if (message.includes('validation') || message.includes('invalid')) {
    return false;
  }

  // Don't retry authentication errors
  if (message.includes('unauthorized') || message.includes('forbidden')) {
    return false;
  }

  // Don't retry not found errors
  if (message.includes('not found')) {
    return false;
  }

  // Retry timeouts, network errors, and rate limits
  if (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('rate limit') ||
    message.includes('503') ||
    message.includes('502') ||
    message.includes('500')
  ) {
    return true;
  }

  // Default: retry unknown errors
  return true;
}

/**
 * Smart retry that only retries retryable errors
 *
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retry attempts
 * @returns The result of the function call
 */
export async function smartRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isRetryableError(error) && maxRetries > 0) {
      console.log(`Retrying... (${maxRetries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return smartRetry(fn, maxRetries - 1);
    }
    throw error;
  }
}

/**
 * Error logging utility
 * Logs errors to console in development, could be extended to send to monitoring service
 *
 * @param error - The error to log
 * @param context - Additional context about where the error occurred
 */
export function logError(error: unknown, context?: string): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[${timestamp}] Error${context ? ` in ${context}` : ''}:`, errorMessage);
  if (stack) {
    console.error('Stack trace:', stack);
  }

  // In production, you might want to send this to a monitoring service
  // e.g., Sentry, LogRocket, etc.
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to monitoring service
    // Sentry.captureException(error, { tags: { context } });
  }
}
