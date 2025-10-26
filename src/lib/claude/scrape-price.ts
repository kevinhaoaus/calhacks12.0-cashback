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
 */
function extractRelevantHtml(html: string): string {
  const parts: string[] = [];

  // 1. Get meta tags (often have price/product info)
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (headMatch) {
    parts.push(headMatch[0].substring(0, 30000));
  }

  // 2. Get sections likely to contain price (search for price keywords)
  const priceKeywords = ['price', 'cost', 'buy', 'cart', 'product', 'amount'];
  const htmlChunks = html.split(/<(?:div|section|article)/i);

  for (const chunk of htmlChunks) {
    const lowerChunk = chunk.toLowerCase();
    if (priceKeywords.some(keyword => lowerChunk.includes(keyword))) {
      // Found a relevant chunk, take first 5000 chars
      parts.push(chunk.substring(0, 5000));
      if (parts.join('').length > 80000) break;
    }
  }

  // 3. If we haven't found much, just take first 50k chars as fallback
  if (parts.length < 2) {
    return html.substring(0, 50000);
  }

  return parts.join('\n');
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

    // Fetch the webpage HTML
    const response = await fetch(productUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
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

    // Use Claude to extract price information from HTML
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
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
  "currency": "USD",
  "available": true,
  "image_url": "https://..."
}

CRITICAL:
- price MUST be a number (convert "$29.99" to 29.99)
- Look in meta tags, JSON data, class="price", id="price", data-price attributes
- If price not found, use 0
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

    return {
      url: productUrl,
      current_price: extracted.price || 0,
      currency: extracted.currency || 'USD',
      available: extracted.available !== false, // Default to true if not specified
      title: extracted.title || 'Unknown Product',
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
