/**
 * Retailer-specific DOM selectors for price scraping
 * Each retailer has selectors for: price, title, image, availability
 */

export interface RetailerSelectors {
  price: string[];
  title: string[];
  image: string[];
  availability: string[];
}

export const RETAILER_SELECTORS: Record<string, RetailerSelectors> = {
  // Amazon
  'amazon.com': {
    price: [
      '.a-price-whole',
      '[data-a-color="price"]',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price .a-offscreen',
    ],
    title: ['#productTitle', 'h1.product-title'],
    image: ['#landingImage', '#imgBlkFront', '.a-dynamic-image'],
    availability: ['#availability span', '#availability', '[data-feature-name="availability"]'],
  },

  // Walmart
  'walmart.com': {
    price: [
      '[itemprop="price"]',
      '[data-automation-id="product-price"]',
      '.price-characteristic',
      'span[class*="price"]',
    ],
    title: ['h1[itemprop="name"]', 'h1', '[data-automation-id="product-title"]'],
    image: ['img[data-testid="hero-image"]', 'img.hover-zoom-hero-image', 'img[itemprop="image"]'],
    availability: ['[data-automation-id="fulfillment-badge"]', '.prod-fulfillment-option'],
  },

  // Target
  'target.com': {
    price: [
      '[data-test="product-price"]',
      'span[data-test="current-price"]',
      'div[data-test="product-price"] span',
    ],
    title: ['h1[data-test="product-title"]', 'h1'],
    image: ['img[data-test="product-image"]', 'picture img'],
    availability: ['div[data-test="shipItButton"]', 'div[data-test="fulfillment-cell"]'],
  },

  // Best Buy
  'bestbuy.com': {
    price: [
      '[data-testid="customer-price"]',
      '.priceView-hero-price span',
      '.priceView-customer-price span',
      'div[class*="priceView"] span',
      '[class*="pricing"] [class*="price"]',
    ],
    title: [
      'h1[class*="heading"]',
      'h1.heading-5',
      'div.sku-title h1',
      'h1',
    ],
    image: [
      'img.primary-image',
      'img[class*="primary"]',
      'button.picture-wrapper img',
      'img[alt*="product"]',
    ],
    availability: [
      '[data-button-state]',
      '.fulfillment-fulfillment-summary',
      'div.fulfillment-add-to-cart-button',
      'button[class*="add-to-cart"]',
    ],
  },

  // Home Depot
  'homedepot.com': {
    price: ['div[data-testid="price-format__main-price"] span', '.price', '[data-testid="price"]'],
    title: ['h1[data-testid="product-title"]', 'h1.product-title'],
    image: ['img.mediaBrowser__image', 'img[data-testid="product-image"]'],
    availability: [
      '[data-testid="fulfillment-summary"]',
      'button[data-testid="add-to-cart"]',
      '.fulfillment__group',
    ],
  },

  // eBay
  'ebay.com': {
    price: [
      '.x-price-primary span.ux-textspans',
      '[itemprop="price"]',
      '.x-bin-price__content span',
      'div.x-price-section span',
    ],
    title: ['h1.x-item-title__mainTitle', 'h1[itemprop="name"]', 'h1.it-ttl'],
    image: ['img.ux-image-carousel-item', 'img#icImg', 'img[itemprop="image"]'],
    availability: [
      '.x-quantity__availability',
      '[data-testid="x-quantity__availability"]',
      '.qtyTxt',
    ],
  },

  // Nike
  'nike.com': {
    price: [
      'div[data-test="product-price"]',
      '.product-price',
      'div.product-price__wrapper',
    ],
    title: ['h1#pdp_product_title', 'h1[data-test="product-title"]'],
    image: ['img.css-1fxh5tw', 'img[data-testid="product-image"]'],
    availability: ['div[data-test="product-availability"]', '.availability-preview'],
  },

  // Generic fallback selectors (works for many sites)
  default: {
    price: [
      '[itemprop="price"]',
      '[class*="price"]',
      '[id*="price"]',
      'span.price',
      'div.price',
      'meta[property="product:price:amount"]',
      'span[data-price]',
    ],
    title: [
      'h1[itemprop="name"]',
      'h1',
      '[itemprop="name"]',
      'meta[property="og:title"]',
      '.product-title',
      '[class*="product-title"]',
    ],
    image: [
      'img[itemprop="image"]',
      'meta[property="og:image"]',
      'img.product-image',
      '[class*="product-image"]',
      'img[data-testid="product-image"]',
    ],
    availability: [
      '[itemprop="availability"]',
      'meta[property="product:availability"]',
      '.availability',
      '[class*="stock"]',
      '[class*="availability"]',
      'button[data-testid="add-to-cart"]',
    ],
  },
};

/**
 * Get selectors for a given URL
 */
export function getSelectorsForUrl(url: string): RetailerSelectors {
  const domain = new URL(url).hostname.toLowerCase().replace('www.', '');

  // Check for exact match
  for (const [key, selectors] of Object.entries(RETAILER_SELECTORS)) {
    if (domain.includes(key)) {
      return selectors;
    }
  }

  // Return default selectors
  return RETAILER_SELECTORS.default;
}

/**
 * Try multiple selectors and return the first match
 */
export async function trySelectors(
  page: any,
  selectors: string[],
  getAttribute?: string
): Promise<string | null> {
  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        if (getAttribute) {
          const value = await element.evaluate(
            (el: Element, attr: string) => el.getAttribute(attr),
            getAttribute
          );
          if (value) return value;
        } else {
          const text = await element.evaluate((el: Element) => el.textContent?.trim() || null);
          if (text) return text;
        }
      }
    } catch (error) {
      // Continue to next selector
      continue;
    }
  }

  // Last resort: try querySelectorAll and get all matching elements
  try {
    const result = await page.evaluate((selectorList: string[], attr?: string) => {
      for (const selector of selectorList) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            if (attr) {
              const value = el.getAttribute(attr);
              if (value) return value;
            } else {
              const text = el.textContent?.trim();
              if (text) return text;
            }
          }
        } catch (e) {
          continue;
        }
      }
      return null;
    }, selectors, getAttribute);

    if (result) return result;
  } catch (error) {
    console.warn('Failed to try selectors with evaluate:', error);
  }

  return null;
}
