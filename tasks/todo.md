# Fix Active Purchases Count Bug

## Current Task: Fix "Active Purchases" Card Displaying Wrong Count

### Problem
The "Active Purchases" card on the dashboard shows 4 (all purchases ever added) instead of 1 (the actual number of items being tracked for price drops).

### Root Cause
Line 83 in `src/app/dashboard/page.tsx` is filtering by `return_status === 'active'`, which counts all purchases with that return status. It should instead count only purchases that have active price tracking enabled (`price_tracking.tracking_active === true`).

### Plan
- [x] Update the `activePurchases` calculation in `src/app/dashboard/page.tsx` to filter by active price tracking instead of return status
- [x] Test the fix by verifying the count matches the actual number of tracked items

### Details
- **File to modify:** `src/app/dashboard/page.tsx`
- **Line to change:** Line 83
- **Current logic:** `purchases?.filter(p => p.return_status === 'active')`
- **New logic:** `purchases?.filter(p => p.price_tracking?.[0]?.tracking_active === true)`

---

## Review

### Changes Made
✅ **Fixed the "Active Purchases" counter** in `src/app/dashboard/page.tsx` (line 83)

**What Changed:**
- **Before:** Counted all purchases where `return_status === 'active'` (which was all 4 purchases)
- **After:** Now counts only purchases where `price_tracking?.[0]?.tracking_active === true` (actual tracked items)

**Impact:**
- The "Active Purchases" card now correctly shows **1** instead of **4**
- The count accurately reflects items that are actively being tracked for price drops
- No database changes needed
- No API changes needed
- Minimal code change (single line)

**Files Modified:**
- `src/app/dashboard/page.tsx` - Updated activePurchases calculation

The fix is complete and follows the principle of making the simplest possible change to solve the problem.

---

# Previous Work

## Recently Completed

### Universal Price Tracking Support ✅

**Problem (Solved!):**
- ✅ Price tracking only worked for specific retailers (Amazon, Walmart, Target, Best Buy, Home Depot, eBay)
- ✅ Random product URLs from other websites showed "Not supported" or failed
- ✅ Users wanted to track prices across ALL websites, not just major retailers

**Solution Implemented:**
- Hybrid system using Bright Data for major retailers and Claude AI for all other websites
- Files created: `src/lib/claude/scrape-price.ts`
- Files modified: `src/lib/bright-data/price-tracker.ts`, `src/components/track-price-dialog.tsx`

### Receipt Upload on Dashboard + Confirmation/Edit Flow ✅

**Problems (Solved!):**
1. ✅ Users can only upload receipts via the `/test` page - not accessible from main dashboard
2. ✅ Receipts are auto-saved to database immediately after processing - no user confirmation
3. ✅ No ability to edit/correct extracted data before saving

**Solution Implemented:**
- Created new "Add Receipt" card on dashboard
- Editable confirmation dialog with all fields
- Files created: `src/components/add-receipt.tsx`, `src/components/receipt-confirmation-dialog.tsx`

### Auto-Suggest Product URLs for Price Tracking ✅
- AI-Powered URL Discovery using Claude + Web Search
- Files created: `src/app/api/suggest-product-url/route.ts`, `src/components/track-price-dialog.tsx`

### Price Tracking Visibility ✅
- Shows all tracked products with price history
- Files created: `src/components/price-tracking-list.tsx`
