# Reclaim.AI - Current Development Status

## Current Task: Receipt Upload on Dashboard + Confirmation/Edit Flow

### Problems
1. Users can only upload receipts via the `/test` page - not accessible from main dashboard
2. Receipts are auto-saved to database immediately after processing - no user confirmation
3. No ability to edit/correct extracted data before saving

### Solution Plan

**Part 1: Add Receipt Upload to Dashboard**
- Create new "Add Receipt" card on dashboard
- Include both upload methods:
  - Image/PDF upload (camera + file picker)
  - Text paste
- Use existing upload/processing APIs

**Part 2: Confirmation & Editing Flow**
- After processing, show confirmation dialog with extracted data
- Make all fields editable:
  - Merchant name
  - Purchase date
  - Total amount
  - Individual items (name, price, quantity)
- Add "Save to Dashboard" and "Cancel" buttons
- Only save to database on confirmation

### Implementation Steps

- [ ] Add receipt upload card to dashboard
- [ ] Create receipt confirmation dialog with editable fields
- [ ] Update upload flow to show confirmation instead of auto-saving
- [ ] Add save/cancel functionality
- [ ] Test complete flow

---

## Recently Completed

### Auto-Suggest Product URLs for Price Tracking ✅

**Files Created:**
- `src/app/api/suggest-product-url/route.ts` - Claude AI + Web Search integration
- `src/components/track-price-dialog.tsx` - Modal with URL suggestions
- `src/components/purchases-list.tsx` - Client component with Track Price buttons

**Features:**
- AI-Powered URL Discovery using Claude + Web Search
- Smart filtering to supported retailers
- Confidence scoring
- Manual URL input fallback

### Price Tracking Visibility ✅

**Files Created:**
- `src/components/price-tracking-list.tsx` - Display and manage tracked products

**Features:**
- Shows all tracked products with price history
- Color-coded price changes
- Remove tracking functionality

---

## Completed Features

### Phase 1: Authentication ✅
- Authentication flow with Supabase
- Login/Signup pages
- Protected dashboard
- User settings with forwarding email

### Phase 2: Claude AI Integration ✅
- Receipt extraction utility
- Return policy analysis
- Refund email generation
- Email webhook processing
- Test interface at `/test`

### Phase 3: Receipt Upload Methods ✅
- OCR utility library using Claude Vision API
- Image upload component with camera support
- File upload API endpoint (`/api/upload-receipt`)
- Updated UI showing text paste and photo upload methods
- Mobile camera capture functionality

### Phase 4: UI Improvements ✅
- Modern landing page template
- Notifications system (API + UI)
- Notification badge in header
- Many new shadcn/ui components
- Better global styles

### Phase 5: Bright Data Integration ✅
- Bright Data utility library
- Price tracking API endpoint
- Product price checking function
- Cron job for daily price checks
- Price drop notification system

### Phase 6: Price Tracking UX ✅
- Price tracking visibility dashboard
- AI-powered URL auto-suggest

## Architecture Overview

### Key Files
- `src/lib/claude/ocr.ts` - Claude Vision OCR
- `src/lib/claude/extract-receipt.ts` - Receipt parsing
- `src/components/file-upload.tsx` - File upload component
- `src/app/api/upload-receipt/route.ts` - Upload endpoint
- `src/app/api/notifications/` - Notification endpoints
- `src/app/notifications/page.tsx` - Notifications UI
- `src/lib/bright-data/price-tracker.ts` - Price tracking logic
- `src/app/api/track-price/route.ts` - Price tracking API
- `src/app/api/cron/check-prices/route.ts` - Daily price checks
- `src/components/price-tracking-list.tsx` - Price tracking display
- `src/components/track-price-dialog.tsx` - Track price modal
- `src/components/purchases-list.tsx` - Purchases with track price buttons

### Database Schema
- retailers
- user_settings
- purchases
- price_tracking
- refund_requests
- notifications
- api_logs
