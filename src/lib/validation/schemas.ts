import { z } from 'zod';

/**
 * Receipt data validation schema
 * Prevents invalid data from entering the database
 */
export const ReceiptDataSchema = z.object({
  merchant: z.string()
    .min(1, 'Merchant name is required')
    .max(255, 'Merchant name too long')
    .trim(),

  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine(dateStr => {
      const date = new Date(dateStr);
      const now = new Date();
      const minDate = new Date('2000-01-01');

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return false;
      }

      // Date must be in the past and after year 2000
      return date <= now && date >= minDate;
    }, 'Purchase date must be in the past (after January 1, 2000)'),

  total: z.number()
    .positive('Total amount must be positive')
    .max(999999.99, 'Total amount is too large')
    .refine(val => {
      // Check for reasonable decimal places (max 2)
      return Number.isInteger(val * 100);
    }, 'Total must have at most 2 decimal places'),

  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'], {
    message: 'Invalid currency code'
  }),

  items: z.array(z.object({
    name: z.string()
      .min(1, 'Item name is required')
      .max(500, 'Item name too long')
      .trim(),
    price: z.number()
      .nonnegative('Item price cannot be negative')
      .max(999999.99, 'Item price too large'),
    quantity: z.number()
      .int('Quantity must be a whole number')
      .positive('Quantity must be at least 1')
      .max(10000, 'Quantity too large')
  })).min(1, 'At least one item is required'),

  confidence: z.number()
    .min(0, 'Confidence must be between 0 and 1')
    .max(1, 'Confidence must be between 0 and 1')
    .optional()
});

export type ReceiptData = z.infer<typeof ReceiptDataSchema>;

/**
 * URL validation for price tracking
 * Prevents SSRF attacks and invalid URLs
 */
export const ProductUrlSchema = z.string()
  .url('Invalid URL format')
  .max(2048, 'URL is too long')
  .refine(url => {
    try {
      const parsed = new URL(url);

      // Block localhost and loopback addresses
      const forbiddenHosts = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '[::]',
        '::1'
      ];

      const hostname = parsed.hostname.toLowerCase();

      if (forbiddenHosts.includes(hostname)) {
        return false;
      }

      // Block private IP address ranges (RFC 1918)
      if (
        hostname.match(/^192\.168\./) ||
        hostname.match(/^10\./) ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)
      ) {
        return false;
      }

      // Block link-local addresses
      if (hostname.match(/^169\.254\./)) {
        return false;
      }

      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return false;
      }

      // URL must have a domain
      if (!parsed.hostname || parsed.hostname.length === 0) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }, 'URL is forbidden or invalid (localhost, private IPs, and non-HTTP(S) protocols are not allowed)');

/**
 * UUID validation for purchase IDs, tracking IDs, etc.
 */
export const UuidSchema = z.string()
  .uuid('Invalid ID format');

/**
 * Refund type validation
 */
export const RefundTypeSchema = z.enum(['price_drop', 'return', 'price_match'], {
  message: 'Invalid refund type'
});

/**
 * Helper function to format Zod validation errors for API responses
 */
export function formatValidationError(error: z.ZodError): {
  error: string;
  details: Array<{ field: string; message: string }>;
} {
  return {
    error: 'Validation failed',
    details: error.issues.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }))
  };
}
