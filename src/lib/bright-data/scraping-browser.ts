import puppeteer, { Browser, Page } from 'puppeteer-core';

const BRIGHT_DATA_CUSTOMER_ID = process.env.BRIGHT_DATA_CUSTOMER_ID!;
// Support both SBR and SBP (typo in env var name)
const BRIGHT_DATA_SBR_PASSWORD = process.env.BRIGHT_DATA_SBR_PASSWORD || process.env.BRIGHT_DATA_SBP_PASSWORD!;
// Allow custom zone name, default to scraping_browser1
const BRIGHT_DATA_ZONE = process.env.BRIGHT_DATA_ZONE || 'scraping_browser1';

if (!BRIGHT_DATA_CUSTOMER_ID || !BRIGHT_DATA_SBR_PASSWORD) {
  console.warn('Bright Data credentials not configured. Customer ID or Password missing.');
}

/**
 * Bright Data Scraping Browser WebSocket endpoint
 * Format: wss://brd-customer-{CUSTOMER_ID}-zone-{ZONE_NAME}:{PASSWORD}@brd.superproxy.io:9222
 */
const SBR_WS_ENDPOINT = `wss://brd-customer-${BRIGHT_DATA_CUSTOMER_ID}-zone-${BRIGHT_DATA_ZONE}:${BRIGHT_DATA_SBR_PASSWORD}@brd.superproxy.io:9222`;

let browserInstance: Browser | null = null;

/**
 * Connect to Bright Data Scraping Browser
 * Reuses existing connection if available
 */
export async function connectScrapingBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  try {
    console.log(`Attempting to connect to Bright Data zone: ${BRIGHT_DATA_ZONE}`);
    console.log(`WebSocket endpoint: ${SBR_WS_ENDPOINT.replace(/:([^:@]+)@/, ':****@')}`); // Log endpoint with hidden password

    browserInstance = await puppeteer.connect({
      browserWSEndpoint: SBR_WS_ENDPOINT,
    });

    console.log('✅ Successfully connected to Bright Data Scraping Browser');
    return browserInstance;
  } catch (error: any) {
    console.error('❌ Failed to connect to Scraping Browser:', error);

    // Provide more specific error messages
    if (error.message?.includes('500')) {
      throw new Error(
        `Bright Data returned 500 Internal Server Error. ` +
        `This usually means the Scraping Browser zone "${BRIGHT_DATA_ZONE}" is not active or needs to be started. ` +
        `Please go to your Bright Data dashboard and ensure the zone is activated.`
      );
    } else if (error.message?.includes('503')) {
      throw new Error(
        `Bright Data Scraping Browser zone "${BRIGHT_DATA_ZONE}" returned 503. ` +
        `This zone may not exist or is not active. Please check your Bright Data dashboard and activate the zone.`
      );
    } else if (error.message?.includes('403')) {
      throw new Error('Bright Data credentials are invalid. Check your Customer ID and Password.');
    }

    throw new Error(`Could not connect to Bright Data Scraping Browser: ${error.message}`);
  }
}

/**
 * Disconnect from Scraping Browser
 */
export async function disconnectScrapingBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.disconnect();
    browserInstance = null;
    console.log('Disconnected from Scraping Browser');
  }
}

/**
 * Create a new page with standard settings
 */
export async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();

  // Set viewport for consistent rendering
  await page.setViewport({ width: 1920, height: 1080 });

  // Set reasonable timeouts
  page.setDefaultTimeout(30000); // 30 seconds
  page.setDefaultNavigationTimeout(30000);

  return page;
}

/**
 * Navigate to URL with retry logic
 */
export async function navigateToUrl(
  page: Page,
  url: string,
  options = { waitUntil: 'networkidle2' as const }
): Promise<void> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await page.goto(url, {
        ...options,
        timeout: 30000,
      });
      return; // Success
    } catch (error) {
      lastError = error as Error;
      console.warn(`Navigation attempt ${attempt}/${maxRetries} failed:`, error);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
      }
    }
  }

  throw new Error(`Failed to navigate to ${url} after ${maxRetries} attempts: ${lastError?.message}`);
}
