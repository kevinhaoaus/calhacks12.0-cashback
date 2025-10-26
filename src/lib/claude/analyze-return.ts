import { anthropic, MODELS } from '@/lib/anthropic';
import { retryWithTimeout, logError } from '@/lib/utils/error-handling';

export interface ReturnAnalysis {
  is_returnable: boolean;
  days_remaining: number;
  return_deadline: string;
  reasoning: string;
  confidence: number;
  recommendations: string[];
}

/**
 * Analyze if a purchase is still returnable based on the return policy
 * Now with timeout and retry logic for reliability
 */
export async function analyzeReturnEligibility(
  purchase: {
    merchant: string;
    purchaseDate: string;
    totalAmount: number;
    items: any[];
  },
  returnPolicy: string
): Promise<ReturnAnalysis> {
  const today = new Date().toISOString().split('T')[0];

  try {
    const message = await retryWithTimeout(
      () => anthropic.messages.create({
        model: MODELS.SONNET,
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `You are a return policy expert. Analyze if this purchase is still returnable.

PURCHASE DETAILS:
- Merchant: ${purchase.merchant}
- Purchase Date: ${purchase.purchaseDate}
- Today's Date: ${today}
- Total Amount: $${purchase.totalAmount}
- Items: ${JSON.stringify(purchase.items)}

RETURN POLICY:
${returnPolicy}

Analyze the return eligibility and provide:
1. Can this purchase still be returned?
2. How many days remain in the return window?
3. What is the exact return deadline?
4. Detailed reasoning based on the policy
5. Recommendations for the user

Return JSON:
{
  "is_returnable": true/false,
  "days_remaining": number,
  "return_deadline": "YYYY-MM-DD",
  "reasoning": "detailed explanation",
  "confidence": 0.95,
  "recommendations": ["action 1", "action 2"]
}

Return ONLY the JSON object.`,
          },
        ],
      }),
      {
        maxRetries: 3,
        baseDelay: 1000,
        timeoutMs: 30000, // 30 second timeout
        onRetry: (attempt, error) => {
          console.log(`Retrying return analysis (attempt ${attempt}): ${error.message}`);
        }
      }
    );

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
    logError(error, 'analyzeReturnEligibility');
    throw new Error('Failed to analyze return eligibility. Please try again later.');
  }
}
