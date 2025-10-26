# Universal Return Policy Scraper

## Current Task: Implement Universal Return Policy Scraping for Any Merchant

### Problem
- Return policies are only hardcoded for 20 retailers (Amazon, Walmart, etc.)
- No return policy TEXT is actually stored in the database
- The system has code to ANALYZE return policies (`analyze-return.ts`) but no code to FETCH them
- This means return eligibility analysis never runs because `return_policy_text` is always null

### Goal
Create a universal return policy scraper that works for ANY merchant website, similar to how the price scraper works for any product.

### Plan

#### Phase 1: Create Return Policy Scraper
- [x] Create `src/lib/claude/scrape-return-policy.ts` with two functions:
  - `findReturnPolicyUrl()` - Discover the return policy URL for a merchant
  - `scrapeReturnPolicy()` - Extract policy text from the policy page using Claude AI

#### Phase 2: Integrate with Purchase Flow
- [x] Update `src/app/api/purchases/route.ts`:
  - When a new purchase is created, check if retailer exists
  - If retailer doesn't have policy text, scrape it automatically
  - Store the policy text and URL in the database
  - Then run the existing return analysis
- [x] Update `src/app/api/webhooks/email/route.ts`:
  - Same integration for email-forwarded receipts

#### Phase 3: Add API Endpoint (Optional but Useful)
- [ ] Create `src/app/api/scrape-policy/route.ts`:
  - Allow manual triggering of policy scrapes
  - Useful for refreshing stale policies or debugging
  - *SKIPPING FOR NOW* - can be added later if needed

### Technical Approach

**Similar to price scraping:**
1. Use Claude AI + web search to find the return policy page URL
2. Fetch the HTML from that URL
3. Use Claude AI to extract clean, structured policy text
4. Store in database with timestamp

**Key differences from price scraping:**
- We're looking for policy PAGES not product pages
- We extract TEXT not numbers
- We cache results longer (policies change less than prices)

### Files to Create
- `src/lib/claude/scrape-return-policy.ts` (main scraper)
- `src/app/api/scrape-policy/route.ts` (optional API endpoint)

### Files to Modify
- `src/app/api/purchases/route.ts` (integrate scraper into purchase flow)
- `src/app/api/webhooks/email/route.ts` (same integration for email webhook)

### Expected Outcome
- Any merchant's return policy will be automatically scraped when first encountered
- Return eligibility analysis will actually run (it currently never runs)
- System will work for ALL merchants, not just the 20 hardcoded ones
- Policies will be cached in database for performance

---

## Review - Universal Return Policy Scraper ✅

### What Was Built

Created a **universal return policy scraper** that automatically fetches return/exchange policies for ANY merchant, not just the 20 hardcoded retailers.

### Files Created
1. **`src/lib/claude/scrape-return-policy.ts`** - Main scraper library with 3 key functions:
   - `findReturnPolicyUrl()` - Uses Claude AI + web search to discover the return policy page URL for any merchant
   - `extractReturnPolicyFromUrl()` - Scrapes and extracts structured policy data (text, return days, price match info) using Claude AI
   - `scrapeReturnPolicy()` - Complete workflow combining both steps

### Files Modified
1. **`src/app/api/purchases/route.ts`** - Integrated policy scraping into manual purchase creation:
   - When a purchase is added, checks if retailer has a policy
   - If retailer exists but has no policy → scrapes and updates
   - If retailer doesn't exist → creates new retailer with scraped policy
   - Return analysis now runs for ALL merchants (was never running before!)

2. **`src/app/api/webhooks/email/route.ts`** - Same integration for email-forwarded receipts:
   - Email receipts now trigger automatic policy scraping
   - Ensures both upload methods benefit from universal policy support

### How It Works

**Similar to the universal price scraper:**
1. **Find the policy URL**: Claude AI uses web search to locate "{merchant} return policy" page
2. **Fetch the HTML**: Standard HTTP request with proper user agent
3. **Extract content**: Smart HTML parsing to find main policy content (removes headers/footers/nav)
4. **Structure the data**: Claude AI extracts:
   - Clean policy summary text (2-3 paragraphs)
   - Return window in days (30, 60, 90, etc.)
   - Price match availability and time window
   - Confidence score
5. **Cache in database**: Store policy with timestamp for reuse

### Key Features
- ✅ **Universal Support**: Works for ANY merchant website, not just major retailers
- ✅ **Automatic**: Scrapes policies on-demand when first encountered
- ✅ **Smart Fallback**: If web search fails, tries common URL patterns (/returns, /return-policy, etc.)
- ✅ **Cached**: Policies stored in database with timestamps (can refresh if stale)
- ✅ **Non-Blocking**: If scraping fails, purchase still completes (degrades gracefully)
- ✅ **Return Analysis Now Works**: The existing `analyze-return.ts` code can finally run!

### Impact

**Before:**
- Only 20 retailers with hardcoded return days (30, 90, etc.)
- NO actual policy text in database
- Return eligibility analysis NEVER ran (always null)
- System couldn't work with unknown merchants

**After:**
- Works with ANY merchant
- Policies are automatically scraped and cached
- Return eligibility analysis runs for all merchants
- Accurate return days from actual policies, not defaults
- Price match information extracted automatically

### Example Flow

1. User uploads a receipt from "Patagonia" (not in the 20 hardcoded retailers)
2. System finds no retailer → triggers `scrapeReturnPolicy("Patagonia")`
3. Claude finds policy URL: `https://www.patagonia.com/returns-warranty.html`
4. Scrapes and extracts:
   - Return days: 60
   - Price match: No
   - Policy text: "Patagonia offers a 60-day return window..."
5. Creates retailer record with policy
6. Runs return eligibility analysis with actual policy text
7. Purchase is saved with accurate return deadline and analysis

This was previously impossible - it would just use 30-day default and skip analysis.

### Simple, Minimal Changes
- Created 1 new library file (similar pattern to price scraping)
- Modified 2 existing API routes (added policy scraping before analysis)
- No database schema changes needed (tables already supported policies)
- No UI changes needed (automatic behind the scenes)

The system now has **universal merchant support** for return policies, just like it has for price tracking!

---

# Previous Work

## Recently Completed

### Fix Active Purchases Count Bug ✅
- Fixed the "Active Purchases" counter to show only tracked items (1) instead of all purchases (4)
- Changed filter from `return_status === 'active'` to `price_tracking?.[0]?.tracking_active === true`
- Files modified: `src/app/dashboard/page.tsx`

### Universal Price Tracking Support ✅
- Hybrid system using Bright Data for major retailers and Claude AI for all other websites
- Files created: `src/lib/claude/scrape-price.ts`
- Files modified: `src/lib/bright-data/price-tracker.ts`, `src/components/track-price-dialog.tsx`

### Receipt Upload on Dashboard + Confirmation/Edit Flow ✅
- Created new "Add Receipt" card on dashboard
- Editable confirmation dialog with all fields
- Files created: `src/components/add-receipt.tsx`, `src/components/receipt-confirmation-dialog.tsx`

### Auto-Suggest Product URLs for Price Tracking ✅
- AI-Powered URL Discovery using Claude + Web Search
- Files created: `src/app/api/suggest-product-url/route.ts`, `src/components/track-price-dialog.tsx`

### Price Tracking Visibility ✅
- Shows all tracked products with price history
- Files created: `src/components/price-tracking-list.tsx`
