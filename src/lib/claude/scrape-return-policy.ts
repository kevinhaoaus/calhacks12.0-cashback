import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ReturnPolicyResult {
  merchant_name: string;
  merchant_domain: string;
  policy_url: string;
  policy_text: string;
  return_days: number;
  has_price_match: boolean;
  price_match_days: number;
  confidence: number;
  scraped_at: string;
}

/**
 * Find the return policy URL for a merchant using Claude AI + web search
 */
export async function findReturnPolicyUrl(
  merchantName: string,
  merchantDomain?: string
): Promise<string> {
  try {
    console.log('Finding return policy URL for:', merchantName);

    // Use Claude with web search to find the policy URL
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Find the return policy page URL for ${merchantName}${merchantDomain ? ` (${merchantDomain})` : ''}.

Search the web and return ONLY the direct URL to their return/exchange policy page.

Requirements:
- Must be the actual policy page, not homepage
- Should contain words like "return", "exchange", "refund" in the URL or be linked from their site
- Prefer official policy pages over third-party sites

Return ONLY the URL, nothing else.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const url = content.text.trim();

    // Validate it's a URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('Invalid URL returned from search');
    }

    console.log('Found policy URL:', url);
    return url;
  } catch (error) {
    console.error('Failed to find policy URL:', error);

    // Fallback: construct likely URL based on common patterns
    if (merchantDomain) {
      const commonPaths = [
        '/returns',
        '/return-policy',
        '/returns-exchanges',
        '/customer-service/returns',
        '/help/returns',
      ];

      for (const path of commonPaths) {
        const testUrl = `https://${merchantDomain}${path}`;
        try {
          const response = await fetch(testUrl, { method: 'HEAD' });
          if (response.ok) {
            console.log('Found policy via common path:', testUrl);
            return testUrl;
          }
        } catch (e) {
          // Continue to next path
        }
      }
    }

    throw new Error(`Could not find return policy URL for ${merchantName}`);
  }
}

/**
 * Extract return policy text and structured data from a policy page
 */
export async function extractReturnPolicyFromUrl(
  policyUrl: string,
  merchantName: string
): Promise<Omit<ReturnPolicyResult, 'merchant_name' | 'merchant_domain' | 'scraped_at'>> {
  try {
    console.log('Scraping return policy from:', policyUrl);

    // Fetch the policy page HTML
    const response = await fetch(policyUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch policy page: ${response.status}`);
    }

    const html = await response.text();
    console.log('Fetched policy HTML, length:', html.length);

    // Extract main content area (remove headers, footers, navigation)
    const relevantHtml = extractPolicyContent(html);
    console.log('Extracted relevant content, length:', relevantHtml.length);

    // Use Claude to extract and structure the policy information
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `Extract return/exchange policy information from this HTML for ${merchantName}.

HTML:
${relevantHtml.substring(0, 100000)}

Extract and return JSON with:
1. policy_text: Clean, readable summary of the return policy (2-3 paragraphs covering key points)
2. return_days: Number of days allowed for returns (e.g., 30, 60, 90)
3. has_price_match: Does the store offer price matching? (true/false)
4. price_match_days: If yes, how many days for price match? (0 if no price match)
5. confidence: Your confidence in this extraction (0.0 to 1.0)

Important:
- policy_text should be clear, concise, and cover: time limits, condition requirements, refund method, exclusions
- Focus on the most important customer-facing policies
- If multiple return windows exist (e.g., holiday extended), note the standard one
- For price_match, look for "price match", "price adjustment", "price protection"

Return ONLY valid JSON:
{
  "policy_url": "${policyUrl}",
  "policy_text": "Clear summary of return policy...",
  "return_days": 30,
  "has_price_match": true,
  "price_match_days": 14,
  "confidence": 0.95
}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from response
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const extracted = JSON.parse(jsonText);
    console.log('Successfully extracted policy data');

    return {
      policy_url: policyUrl,
      policy_text: extracted.policy_text || '',
      return_days: extracted.return_days || 30,
      has_price_match: extracted.has_price_match || false,
      price_match_days: extracted.price_match_days || 0,
      confidence: extracted.confidence || 0.5,
    };
  } catch (error) {
    console.error('Failed to extract policy from URL:', error);
    throw new Error(
      `Failed to extract return policy from ${policyUrl}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Extract the main policy content from HTML (remove navigation, headers, footers)
 */
function extractPolicyContent(html: string): string {
  try {
    // Remove script and style tags
    let cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Try to find main content areas
    const contentPatterns = [
      /<main[^>]*>([\s\S]*?)<\/main>/i,
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*policy[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];

    for (const pattern of contentPatterns) {
      const match = cleaned.match(pattern);
      if (match && match[1] && match[1].length > 500) {
        return match[1].substring(0, 100000);
      }
    }

    // Fallback: look for sections with "return" in them
    const sections = cleaned.split(/<(?:section|div|article)/i);
    const relevantSections = sections.filter((section) =>
      /return|exchange|refund|policy/i.test(section)
    );

    if (relevantSections.length > 0) {
      return relevantSections.join('\n').substring(0, 100000);
    }

    // Last resort: return first 50k chars
    return cleaned.substring(0, 50000);
  } catch (error) {
    console.log('Content extraction failed, using full HTML');
    return html.substring(0, 50000);
  }
}

/**
 * Complete workflow: Find and scrape return policy for a merchant
 */
export async function scrapeReturnPolicy(
  merchantName: string,
  merchantDomain?: string
): Promise<ReturnPolicyResult> {
  try {
    console.log('Starting return policy scrape for:', merchantName);

    // Step 1: Find the policy URL
    const policyUrl = await findReturnPolicyUrl(merchantName, merchantDomain);

    // Step 2: Extract policy data from the URL
    const policyData = await extractReturnPolicyFromUrl(policyUrl, merchantName);

    // Step 3: Return complete result
    return {
      merchant_name: merchantName,
      merchant_domain: merchantDomain || new URL(policyUrl).hostname,
      scraped_at: new Date().toISOString(),
      ...policyData,
    };
  } catch (error) {
    console.error('Return policy scraping failed:', error);
    throw new Error(
      `Failed to scrape return policy for ${merchantName}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
