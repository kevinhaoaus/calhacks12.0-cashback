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
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Use Claude to extract price information from HTML
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `You are a web scraper. Extract the product information from this HTML page.

HTML:
${html.substring(0, 50000)}

Extract and return ONLY a JSON object with these fields (no markdown, no explanation):
{
  "title": "Product name",
  "price": 29.99,
  "currency": "USD",
  "available": true,
  "image_url": "https://..."
}

Rules:
- price must be a number (extract from text like "$29.99" or "29.99")
- currency should be "USD", "EUR", "GBP", etc. (default to "USD" if unclear)
- available should be true if product is in stock, false otherwise
- image_url should be the main product image URL (optional)
- If you cannot find the price, return price as 0`,
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
