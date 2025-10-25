import { brightDataClient } from './index';

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
 * Uses Bright Data's E-commerce dataset collectors
 */
export async function checkProductPrice(
  productUrl: string
): Promise<PriceCheckResult> {
  try {
    // Determine which dataset to use based on URL
    const datasetId = getDatasetForUrl(productUrl);

    // Trigger a data collection
    const response = await brightDataClient.post(
      `/datasets/v3/trigger`,
      {
        dataset_id: datasetId,
        endpoint: 'product',
        data: [{ url: productUrl }],
      }
    );

    const snapshotId = response.data.snapshot_id;

    // Poll for results (typically takes 10-30 seconds)
    const result = await pollForResults(snapshotId);

    return {
      url: productUrl,
      current_price: result.final_price || result.price,
      currency: result.currency || 'USD',
      available: result.availability !== 'out_of_stock',
      title: result.title || result.name,
      image_url: result.image,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Price check failed:', error);
    throw new Error(`Failed to check price for ${productUrl}`);
  }
}

/**
 * Map URL to appropriate Bright Data dataset
 */
function getDatasetForUrl(url: string): string {
  const domain = new URL(url).hostname.toLowerCase();

  const datasetMap: Record<string, string> = {
    'amazon.com': 'gd_amazon_products',
    'walmart.com': 'gd_walmart_products',
    'target.com': 'gd_target_products',
    'bestbuy.com': 'gd_bestbuy_products',
    'homedepot.com': 'gd_homedepot_products',
    'ebay.com': 'gd_ebay_products',
  };

  for (const [key, value] of Object.entries(datasetMap)) {
    if (domain.includes(key)) return value;
  }

  // Default to universal web scraper
  return 'gd_web_scraper_api';
}

/**
 * Poll Bright Data API for results
 */
async function pollForResults(
  snapshotId: string,
  maxAttempts = 10
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3s

    const response = await brightDataClient.get(
      `/datasets/v3/snapshot/${snapshotId}`
    );

    if (response.data.status === 'ready') {
      // Download the results
      const dataResponse = await brightDataClient.get(
        `/datasets/v3/snapshot/${snapshotId}/download`
      );
      return dataResponse.data[0]; // Return first result
    }
  }

  throw new Error('Timeout waiting for price check results');
}

/**
 * Estimate Bright Data cost for tracking
 */
export function estimateBrightDataCost(
  service: 'dataset' | 'scraper' | 'proxy',
  requests: number
): number {
  const pricing = {
    dataset: 0.005, // $0.005 per request (average)
    scraper: 0.01, // $0.01 per page
    proxy: 0.015, // $0.015 per request with proxy
  };

  return requests * pricing[service];
}
