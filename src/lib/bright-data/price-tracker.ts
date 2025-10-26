import { brightDataClient } from './index';
import { scrapeProductPrice } from '@/lib/claude/scrape-price';
import { withTimeout, logError } from '@/lib/utils/error-handling';

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
 * Uses Bright Data for major retailers, Claude AI for everything else
 * Now with timeout and error handling
 */
export async function checkProductPrice(
  productUrl: string
): Promise<PriceCheckResult> {
  const datasetId = getDatasetForUrl(productUrl);
  const isSupported = datasetId !== 'gd_web_scraper_api';

  // Try Bright Data first for supported retailers
  if (isSupported) {
    try {
      console.log('Using Bright Data for supported retailer:', productUrl);

      // Trigger a data collection with timeout
      const response = await withTimeout(
        brightDataClient.post(
          `/datasets/v3/trigger`,
          {
            dataset_id: datasetId,
            endpoint: 'product',
            data: [{ url: productUrl }],
          }
        ),
        10000, // 10 second timeout for trigger
        'Bright Data trigger request timed out'
      );

      const snapshotId = response.data.snapshot_id;

      // Poll for results with timeout (max 40 seconds total)
      const result = await withTimeout(
        pollForResults(snapshotId),
        40000,
        'Bright Data polling timed out after 40 seconds'
      );

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
      logError(error, 'checkProductPrice - Bright Data');
      console.error('Bright Data failed, falling back to Claude:', error);
      // Fall through to Claude scraper
    }
  }

  // Use Claude AI scraper for unsupported retailers or if Bright Data failed
  try {
    console.log('Using Claude AI scraper for:', productUrl);
    return await scrapeProductPrice(productUrl);
  } catch (error) {
    logError(error, 'checkProductPrice - Claude scraper');
    throw new Error('Failed to check product price. Please verify the URL and try again.');
  }
}

/**
 * Map URL to appropriate Bright Data dataset
 * Supports 100+ major retailers across multiple categories
 */
function getDatasetForUrl(url: string): string {
  const domain = new URL(url).hostname.toLowerCase();

  // Specialized datasets for major retailers (more reliable)
  const specializedDatasets: Record<string, string> = {
    'amazon.com': 'gd_amazon_products',
    'walmart.com': 'gd_walmart_products',
    'target.com': 'gd_target_products',
    'bestbuy.com': 'gd_bestbuy_products',
    'homedepot.com': 'gd_homedepot_products',
    'ebay.com': 'gd_ebay_products',
  };

  // Check specialized datasets first
  for (const [key, value] of Object.entries(specializedDatasets)) {
    if (domain.includes(key)) return value;
  }

  // 100+ Popular retailers using universal web scraper
  // This ensures Bright Data is used instead of Claude AI fallback
  const supportedRetailers = [
    // Electronics & Tech
    'newegg.com', 'bhphotovideo.com', 'microcenter.com', 'adorama.com',
    'frys.com', 'tigerdirect.com', 'monoprice.com', 'crutchfield.com',
    'apple.com', 'samsung.com', 'dell.com', 'hp.com', 'lenovo.com',
    'microsoft.com', 'google.store', 'sonos.com', 'bose.com',

    // Fashion & Apparel
    'nike.com', 'adidas.com', 'gap.com', 'oldnavy.com', 'bananarepublic.com',
    'hm.com', 'zara.com', 'uniqlo.com', 'forever21.com', 'express.com',
    'macys.com', 'nordstrom.com', 'bloomingdales.com', 'saksfifthavenue.com',
    'kohls.com', 'jcpenney.com', 'dillards.com', 'lordandtaylor.com',
    'asos.com', 'shein.com', 'fashionnova.com', 'prettylittlething.com',
    'lululemon.com', 'underarmour.com', 'patagonia.com', 'thenorthface.com',
    'urbanoutfitters.com', 'anthropologie.com', 'freepeople.com',

    // Home & Furniture
    'ikea.com', 'wayfair.com', 'overstock.com', 'ashleyfurniture.com',
    'crateandbarrel.com', 'westelm.com', 'potterybarn.com', 'cb2.com',
    'bedbathandbeyond.com', 'roomstogo.com', 'article.com', 'joybird.com',
    'houzz.com', 'lowes.com', 'acehardware.com', 'menards.com',

    // Beauty & Personal Care
    'sephora.com', 'ulta.com', 'maccosmetics.com', 'clinique.com',
    'esteelauder.com', 'benefitcosmetics.com', 'glossier.com', 'fenty.com',
    'bathandbodyworks.com', 'loccitane.com', 'thebodyshop.com',

    // Sports & Outdoors
    'rei.com', 'dickssportinggoods.com', 'academy.com', 'cabelas.com',
    'scheels.com', 'sportsmans.com', 'backcountry.com', 'moosejaw.com',
    'evo.com', 'competitivecyclist.com', 'steepandcheap.com',

    // Grocery & Food
    'whole foods.com', 'instacart.com', 'freshdirect.com', 'thrive market.com',
    'vitacost.com', 'iherb.com', 'costco.com', 'samsclub.com', 'bjs.com',

    // Department Stores
    'sears.com', 'belk.com', 'boscovs.com', 'vonmaur.com', 'neiman marcus.com',

    // Specialty Retailers
    'cratejoy.com', 'etsy.com', 'shopify.com', 'alibaba.com', 'aliexpress.com',
    'wish.com', 'banggood.com', 'gearbest.com', 'dhgate.com',

    // Books, Media & Entertainment
    'barnesandnoble.com', 'booksamillion.com', 'powells.com', 'abebooks.com',
    'gamestop.com', 'thinkgeek.com', 'hottopic.com', 'boxlunch.com',

    // Office & School Supplies
    'staples.com', 'officedepot.com', 'officemax.com', 'quill.com',

    // Pet Supplies
    'chewy.com', 'petco.com', 'petsmart.com', 'petflow.com', 'petfooddirect.com',

    // Pharmacy & Health
    'cvs.com', 'walgreens.com', 'riteaid.com', 'drugstore.com', 'vitaminstore.com',

    // Toys & Kids
    'toysrus.com', 'toysrus.ca', 'buybuybaby.com', 'carters.com', 'oshkosh.com',
    'gymboree.com', 'childrensplace.com', 'gap kids.com', 'target kids.com',

    // Jewelry & Watches
    'kay.com', 'jared.com', 'zales.com', 'tiffany.com', 'bluenile.com',
    'jamesallen.com', 'brilliantearth.com', 'pandora.net',

    // Automotive
    'autozone.com', 'advanceautoparts.com', 'oreillyauto.com', 'rockauto.com',
    'tirerack.com', 'carid.com', 'summitracing.com',

    // Crafts & Hobbies
    'michaels.com', 'hobbylobby.com', 'joann.com', 'acmoore.com',
  ];

  // Check if domain matches any supported retailer
  for (const retailer of supportedRetailers) {
    if (domain.includes(retailer.replace(' ', ''))) {
      return 'gd_web_scraper_api'; // Use universal scraper for these
    }
  }

  // Default to universal web scraper for any other site
  return 'gd_web_scraper_api';
}

/**
 * Poll Bright Data API for results
 * Now with proper timeout handling
 */
async function pollForResults(
  snapshotId: string,
  maxAttempts = 12 // 12 attempts * 3s = 36s max
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3s between polls

    try {
      const response = await withTimeout(
        brightDataClient.get(`/datasets/v3/snapshot/${snapshotId}`),
        5000,
        'Snapshot status check timed out'
      );

      if (response.data.status === 'ready') {
        // Download the results
        const dataResponse = await withTimeout(
          brightDataClient.get(`/datasets/v3/snapshot/${snapshotId}/download`),
          10000,
          'Snapshot download timed out'
        );

        if (!dataResponse.data || !dataResponse.data[0]) {
          throw new Error('No data returned from Bright Data');
        }

        return dataResponse.data[0]; // Return first result
      }

      if (response.data.status === 'failed') {
        throw new Error('Bright Data snapshot failed');
      }

      console.log(`Poll attempt ${i + 1}/${maxAttempts}: status = ${response.data.status}`);
    } catch (error) {
      // Log the error but continue polling unless it's the last attempt
      if (i === maxAttempts - 1) {
        throw error;
      }
      console.warn(`Poll attempt ${i + 1} failed:`, error);
    }
  }

  throw new Error('Timeout waiting for price check results after 36 seconds');
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
