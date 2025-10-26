import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ScrapedPriceResult {
  url: string;
  current_price: number;
  currency: string;
  available: boolean;
  title: string;
  image_url?: string;
  timestamp: string;
}

/**
 * Extract structured data from HTML (JSON-LD, meta tags, etc.)
 * This is faster and more reliable than parsing full HTML
 */
function extractStructuredData(html: string): Omit<ScrapedPriceResult, 'url' | 'timestamp'> | null {
  try {
    // Try to extract JSON-LD schema.org data
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);

        // Handle array of objects
        const product = Array.isArray(jsonLd)
          ? jsonLd.find((item: any) => item['@type'] === 'Product')
          : jsonLd['@type'] === 'Product' ? jsonLd : null;

        if (product) {
          const price = product.offers?.price || product.offers?.[0]?.price;
          const priceNum = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : price;

          if (priceNum && priceNum > 0) {
            return {
              title: product.name || 'Unknown Product',
              current_price: priceNum,
              currency: product.offers?.priceCurrency || product.offers?.[0]?.priceCurrency || 'USD',
              available: product.offers?.availability?.includes('InStock') !== false,
              image_url: product.image || product.image?.[0],
            };
          }
        }
      } catch (e) {
        console.log('Failed to parse JSON-LD:', e);
      }
    }

    // Try Open Graph meta tags
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1];
    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
    const ogPrice = html.match(/<meta[^>]*property=["']og:price:amount["'][^>]*content=["']([^"']+)["']/i)?.[1];
    const ogCurrency = html.match(/<meta[^>]*property=["']og:price:currency["'][^>]*content=["']([^"']+)["']/i)?.[1];

    if (ogPrice && ogTitle) {
      const priceNum = parseFloat(ogPrice.replace(/[^0-9.]/g, ''));
      if (priceNum > 0) {
        return {
          title: ogTitle,
          current_price: priceNum,
          currency: ogCurrency || 'USD',
          available: true,
          image_url: ogImage,
        };
      }
    }

    // Try common price selectors in the HTML
    const pricePatterns = [
      /["']price["']\s*:\s*["']?(\d+\.?\d*)["']?/i,
      /["']currentPrice["']\s*:\s*["']?(\d+\.?\d*)["']?/i,
      /data-price=["'](\d+\.?\d*)["']/i,
      /class=["'][^"']*price[^"']*["'][^>]*>[\s\S]*?\$(\d+\.?\d*)/i,
    ];

    for (const pattern of pricePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const priceNum = parseFloat(match[1]);
        if (priceNum > 0) {
          // Extract title from page title tag
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          return {
            title: titleMatch?.[1] || 'Product',
            current_price: priceNum,
            currency: 'USD',
            available: true,
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.log('Structured data extraction failed:', error);
    return null;
  }
}

/**
 * Extract relevant HTML portions for Claude (smarter than just taking first N chars)
 * Reduced to save tokens and avoid rate limits
 */
function extractRelevantHtml(html: string): string {
  const parts: string[] = [];

  // 1. Get meta tags (often have price/product info) - reduced size
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (headMatch) {
    parts.push(headMatch[0].substring(0, 10000)); // Reduced from 30000
  }

  // 2. Get sections likely to contain price (search for price keywords)
  const priceKeywords = ['price', 'cost', 'buy', 'cart', 'product', 'amount'];
  const htmlChunks = html.split(/<(?:div|section|article)/i);

  for (const chunk of htmlChunks) {
    const lowerChunk = chunk.toLowerCase();
    if (priceKeywords.some(keyword => lowerChunk.includes(keyword))) {
      // Found a relevant chunk, take first 2000 chars (reduced from 5000)
      parts.push(chunk.substring(0, 2000));
      if (parts.join('').length > 30000) break; // Reduced from 80000
    }
  }

  // 3. If we haven't found much, just take first 20k chars as fallback (reduced from 50k)
  if (parts.length < 2) {
    return html.substring(0, 20000);
  }

  return parts.join('\n').substring(0, 30000); // Hard limit at 30k to save tokens
}

/**
 * Scrape product price from any website using Claude AI
 * This is a universal fallback when Bright Data doesn't support the retailer
 */
export async function scrapeProductPrice(
  productUrl: string
): Promise<ScrapedPriceResult> {
  try {
    console.log('Using Claude AI to scrape price from:', productUrl);

    // Fetch the webpage HTML with timeout and retry logic
    let html: string = '';
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout (increased for slow sites)

        const response = await fetch(productUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        html = await response.text();
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;
        console.warn(`Fetch attempt ${attempt}/2 failed:`, (error as Error).message);

        if (attempt === 2) {
          // Last attempt failed, throw error
          throw new Error(`Failed to fetch page after 2 attempts: ${lastError.message}`);
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    console.log('Fetched HTML length:', html.length);

    // Try to extract structured data first (faster and more reliable)
    const structuredData = extractStructuredData(html);
    if (structuredData) {
      console.log('Extracted from structured data:', structuredData);
      return {
        url: productUrl,
        ...structuredData,
        timestamp: new Date().toISOString(),
      };
    }

    // Extract relevant portions of HTML for Claude
    const relevantHtml = extractRelevantHtml(html);
    console.log('Sending', relevantHtml.length, 'chars to Claude');

    // Use Claude Haiku (cheaper, faster, less tokens) to extract price information from HTML
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Use Haiku instead of Sonnet (cheaper + faster)
      max_tokens: 500, // Reduced from 1000
      messages: [
        {
          role: 'user',
          content: `Extract product information from this HTML. Look for price indicators like "$", "price", "cost", class names with "price", data attributes, etc.

HTML:
${relevantHtml}

Return ONLY valid JSON (no markdown, no explanation):
{
  "title": "Full product name",
  "price": 29.99,
  "monthly_price": 33.00,
  "payment_months": 24,
  "currency": "USD",
  "available": true,
  "image_url": "https://..."
}

CRITICAL RULES:
- price MUST be a number (convert "$29.99" to 29.99)
- Look in meta tags, JSON data, class="price", id="price", data-price attributes
- If you find a FULL one-time purchase price, put it in "price" and set monthly_price to null
- If you ONLY find monthly/installment prices (e.g., "$33/mo", "per month"), extract:
  * monthly_price: the monthly payment amount
  * payment_months: number of months (look for "24 months", "24-month", "over 24 mo", "for 24 months", etc.)
  * ONLY set payment_months if you can find it explicitly on the page
  * If months not found, set payment_months to null
- Common patterns: "$33/mo for 24 months", "$33.25/month", "24 monthly payments of $33"
- currency defaults to "USD"
- available defaults to true`,
        },
      ],
    });

    // Parse Claude's response
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Extract JSON from response (Claude might wrap it in markdown)
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const extracted = JSON.parse(jsonText);

    console.log('Claude extracted price data:', extracted);

    const title = extracted.title || 'Unknown Product';
    let price = extracted.price || 0;

    // If we have monthly price info AND number of months, calculate the full price
    if (extracted.monthly_price && extracted.monthly_price > 0 && extracted.payment_months && extracted.payment_months > 0) {
      const monthlyPrice = extracted.monthly_price;
      const months = extracted.payment_months;
      const calculatedPrice = monthlyPrice * months;

      console.log(`📊 Calculated full price from monthly: $${monthlyPrice}/mo × ${months} months = $${calculatedPrice}`);

      // If we don't have a full price, or the monthly calculation is higher, use it
      if (price === 0 || calculatedPrice > price) {
        price = calculatedPrice;
      }
    } else if (extracted.monthly_price && extracted.monthly_price > 0 && !extracted.payment_months) {
      console.warn(`⚠️ Found monthly price $${extracted.monthly_price}/mo but no payment_months specified. Cannot calculate full price.`);
    }

    return {
      url: productUrl,
      current_price: price,
      currency: extracted.currency || 'USD',
      available: extracted.available !== false, // Default to true if not specified
      title,
      image_url: extracted.image_url,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Claude price scraping failed:', error);
    throw new Error(
      `Failed to scrape price from ${productUrl}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
