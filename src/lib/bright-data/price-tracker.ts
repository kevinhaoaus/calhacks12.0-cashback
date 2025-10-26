import { scrapeProductPrice } from '@/lib/claude/scrape-price';
import { logError } from '@/lib/utils/error-handling';
import { connectScrapingBrowser, createPage, navigateToUrl } from './scraping-browser';
import { getSelectorsForUrl, trySelectors } from './selectors';

export interface PriceCheckResult {
  url: string;
  current_price: number;
  currency: string;
  available: boolean;
  title: string;
  image_url?: string;
  timestamp: string;
}

/**
 * Check current price for a product URL
 * Uses Bright Data Scraping Browser (agent) with fallback to Claude AI
 */
export async function checkProductPrice(
  productUrl: string
): Promise<PriceCheckResult> {
  let scrapingBrowserError: Error | null = null;

  // Try Bright Data first, fallback to Claude AI if it fails
  const skipBrightData = false;

  if (!skipBrightData) {
    // Try Bright Data Scraping Browser first
    try {
      console.log('Using Bright Data Scraping Browser for:', productUrl);
      return await scrapeWithBrowser(productUrl);
    } catch (error) {
      scrapingBrowserError = error as Error;
      logError(error, 'checkProductPrice - Scraping Browser');
      console.error('Scraping Browser failed:', error);
    }
  } else {
    console.log('Bright Data not configured, using Claude AI directly for:', productUrl);
  }

  // Fallback to Claude AI scraper
  try {
    console.log('Using Claude AI scraper for:', productUrl);
    return await scrapeProductPrice(productUrl);
  } catch (error) {
    logError(error, 'checkProductPrice - Claude scraper');
    console.error('Claude scraper also failed:', error);

    // Provide detailed error message
    if (scrapingBrowserError) {
      const browserError = scrapingBrowserError?.message || 'Unknown error';
      const claudeError = (error as Error).message || 'Unknown error';

      throw new Error(
        `Failed to check product price. Both methods failed:\n` +
        `1. Scraping Browser: ${browserError}\n` +
        `2. Claude AI: ${claudeError}\n` +
        `Please try a different product URL or try again later.`
      );
    } else {
      throw new Error(
        `Failed to scrape price from ${productUrl}: ${(error as Error).message}`
      );
    }
  }
}

/**
 * Scrape product price using Bright Data Scraping Browser
 */
async function scrapeWithBrowser(productUrl: string): Promise<PriceCheckResult> {
  const browser = await connectScrapingBrowser();
  const page = await createPage(browser);

  try {
    // Navigate to product page
    await navigateToUrl(page, productUrl);

    // Get retailer-specific selectors
    const selectors = getSelectorsForUrl(productUrl);

    // Extract product data using selectors
    const [priceText, title, imageUrl, availabilityText] = await Promise.all([
      trySelectors(page, selectors.price),
      trySelectors(page, selectors.title),
      trySelectors(page, selectors.image, 'src') ||
        page.evaluate(() => {
          const ogImage = document.querySelector('meta[property="og:image"]');
          return ogImage?.getAttribute('content') || null;
        }),
      trySelectors(page, selectors.availability),
    ]);

    console.log('Scraping Browser extracted:', { priceText, title, imageUrl, availabilityText });

    // Parse price
    let price = parsePrice(priceText);

    // If no price found with selectors, try to find it in page text
    if (!price) {
      console.log('Price not found with selectors, searching page text...');

      const pagePriceMatch = await page.evaluate(() => {
        const bodyText = document.body.innerText;

        // Look for price patterns like $123.45, $123, etc.
        const pricePatterns = [
          /\$\s*(\d{1,5}(?:,\d{3})*(?:\.\d{2})?)/g, // $1,234.56 or $1234.56
          /(\d{1,5}(?:,\d{3})*(?:\.\d{2})?)\s*(?:USD|dollars?)/gi, // 1234.56 USD
        ];

        for (const pattern of pricePatterns) {
          const matches = [...bodyText.matchAll(pattern)];
          if (matches.length > 0) {
            // Return the first reasonable price (not 0, not too high)
            for (const match of matches) {
              const priceNum = parseFloat(match[1].replace(/,/g, ''));
              if (priceNum > 0 && priceNum < 100000) {
                return match[0];
              }
            }
          }
        }

        return null;
      });

      console.log('Found price in page text:', pagePriceMatch);
      price = parsePrice(pagePriceMatch);
    }

    if (!price) {
      console.error('Failed to parse price from text:', priceText);
      const pageContent = await page.evaluate(() => document.body.innerText.substring(0, 500));
      console.log('Page content preview:', pageContent);
      throw new Error(`Could not extract price from page. Price text found: "${priceText}"`);
    }

    // Check availability
    const available = checkAvailability(availabilityText);

    return {
      url: productUrl,
      current_price: price,
      currency: 'USD', // TODO: Add currency detection
      available,
      title: title || 'Unknown Product',
      image_url: imageUrl || undefined,
      timestamp: new Date().toISOString(),
    };
  } finally {
    await page.close();
  }
}

/**
 * Parse price from text (handles $49.99, 49.99, etc.)
 */
function parsePrice(priceText: string | null): number | null {
  if (!priceText) return null;

  // Remove currency symbols, commas, and whitespace
  const cleaned = priceText.replace(/[$,\s]/g, '');

  // Extract first number (handles cases like "$49.99 - $59.99")
  const match = cleaned.match(/(\d+\.?\d*)/);
  if (!match) return null;

  const price = parseFloat(match[1]);
  return isNaN(price) ? null : price;
}

/**
 * Check if product is available based on availability text
 */
function checkAvailability(availabilityText: string | null): boolean {
  if (!availabilityText) return true; // Assume available if no info

  const unavailableKeywords = [
    'out of stock',
    'unavailable',
    'sold out',
    'not available',
    'discontinued',
  ];

  const lowerText = availabilityText.toLowerCase();
  return !unavailableKeywords.some((keyword) => lowerText.includes(keyword));
}

/**
 * Estimate Bright Data Scraping Browser cost
 */
export function estimateBrightDataCost(requests: number): number {
  // Scraping Browser pricing: ~$0.01-0.015 per page view
  const pricePerRequest = 0.0125; // Average $0.0125 per request
  return requests * pricePerRequest;
}
