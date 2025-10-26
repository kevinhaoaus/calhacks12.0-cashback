import { anthropic, MODELS } from '@/lib/anthropic';
import { retryWithTimeout, logError } from '@/lib/utils/error-handling';

export interface ReceiptData {
  merchant: string;
  date: string;
  total: number;
  currency: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  confidence: number;
}

/**
 * Extract structured data from receipt OCR text using Claude
 * Now with timeout and retry logic for reliability
 */
export async function extractReceiptData(
  ocrText: string
): Promise<ReceiptData> {
  try {
    const message = await retryWithTimeout(
      () => anthropic.messages.create({
        model: MODELS.SONNET,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are a receipt data extraction expert. Extract structured data from this receipt OCR text.

OCR Text:
${ocrText}

Return a JSON object with this exact structure:
{
  "merchant": "store name",
  "date": "YYYY-MM-DD",
  "total": 0.00,
  "currency": "USD",
  "items": [
    {"name": "item name", "price": 0.00, "quantity": 1}
  ],
  "confidence": 0.95
}

Rules:
- merchant: Identify the store name (e.g., "Target", "Walmart", "Amazon")
- date: Extract purchase date in ISO format (YYYY-MM-DD)
- total: Final total amount paid (as a number)
- currency: Default to "USD" unless specified
- items: List all purchased items with prices (be thorough)
- confidence: Your confidence in the extraction (0-1)

Return ONLY the JSON object, no explanation or markdown.`,
          },
        ],
      }),
      {
        maxRetries: 3,
        baseDelay: 1000,
        timeoutMs: 30000, // 30 second timeout
        onRetry: (attempt, error) => {
          console.log(`Retrying receipt extraction (attempt ${attempt}): ${error.message}`);
        }
      }
    );

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse the JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Claude response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    logError(error, 'extractReceiptData');
    throw new Error('Failed to extract receipt data. Please try again or check the image quality.');
  }
}
