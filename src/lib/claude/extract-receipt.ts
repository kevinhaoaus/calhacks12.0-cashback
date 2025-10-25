import { anthropic, MODELS } from '@/lib/anthropic';

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
 */
export async function extractReceiptData(
  ocrText: string
): Promise<ReceiptData> {
  const message = await anthropic.messages.create({
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
  });

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
}
