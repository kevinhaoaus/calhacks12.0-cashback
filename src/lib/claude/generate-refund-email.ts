import { anthropic, MODELS } from '@/lib/anthropic';
import { retryWithTimeout, logError } from '@/lib/utils/error-handling';

export interface RefundEmail {
  subject: string;
  body: string;
  tone: string;
}

/**
 * Generate a professional refund request email using Claude
 * Now with timeout and retry logic for reliability
 */
export async function generateRefundEmail(
  refundType: 'price_drop' | 'return' | 'price_match',
  purchase: {
    merchant: string;
    purchaseDate: string;
    orderNumber?: string;
    originalPrice: number;
    currentPrice?: number;
    items: any[];
  },
  userInfo: {
    name: string;
    email: string;
  }
): Promise<RefundEmail> {
  try {
    const message = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `You are a professional email writer specializing in customer service requests. Generate a refund request email.

REFUND TYPE: ${refundType}
MERCHANT: ${purchase.merchant}
PURCHASE DATE: ${purchase.purchaseDate}
${purchase.orderNumber ? `ORDER NUMBER: ${purchase.orderNumber}` : ''}
ORIGINAL PRICE: $${purchase.originalPrice}
${purchase.currentPrice ? `CURRENT PRICE: $${purchase.currentPrice}` : ''}
CUSTOMER NAME: ${userInfo.name}
CUSTOMER EMAIL: ${userInfo.email}

Write a professional, polite email requesting a ${refundType === 'price_drop' ? 'price adjustment' : 'return authorization'}.

Guidelines:
- Be polite and professional
- Reference specific policy terms if applicable
- Include all relevant details (order number, dates, amounts)
- Request specific action
- Thank them for their time
- Keep it concise (under 200 words)

Return JSON:
{
  "subject": "email subject line",
  "body": "email body with newlines",
  "tone": "professional|friendly|formal"
}

Return ONLY the JSON object.`,
      },
    ],
  });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Claude response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    logError(error, 'generateRefundEmail');
    throw new Error('Failed to generate refund email. Please try again later.');
  }
}
