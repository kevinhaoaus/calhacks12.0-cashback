# Reclaim.AI - Comprehensive Testing & Bug Analysis Plan

## Project Understanding

**Reclaim.AI** is a post-purchase money recovery system that:
- Extracts receipt data using AI (Claude)
- Tracks prices using Bright Data and web scraping
- Analyzes return policies automatically
- Generates refund request emails
- Monitors price drops and return deadlines
- Sends notifications for opportunities

---

## 🚀 IMPLEMENTATION PLAN - Critical Fixes

Based on the comprehensive bug analysis, here's the step-by-step plan to fix critical issues:

### Phase 1: Input Validation (30-45 minutes)

#### 1.1 Install Zod Package
```bash
npm install zod
```

#### 1.2 Create Validation Schemas
**File**: `src/lib/validation/schemas.ts` (NEW FILE)
```typescript
import { z } from 'zod';

// Receipt data validation
export const ReceiptDataSchema = z.object({
  merchant: z.string()
    .min(1, 'Merchant name is required')
    .max(255, 'Merchant name too long'),

  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .refine(dateStr => {
      const date = new Date(dateStr);
      const now = new Date();
      const minDate = new Date('2000-01-01');
      return date <= now && date >= minDate;
    }, 'Date must be in the past (after 2000)'),

  total: z.number()
    .positive('Amount must be positive')
    .max(999999.99, 'Amount too large'),

  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD'], {
    errorMap: () => ({ message: 'Invalid currency' })
  }),

  items: z.array(z.object({
    name: z.string().min(1, 'Item name required'),
    price: z.number().nonnegative('Price cannot be negative'),
    quantity: z.number().int().positive('Quantity must be positive')
  })).min(1, 'At least one item required'),

  confidence: z.number().min(0).max(1).optional()
});

// URL validation for price tracking
export const ProductUrlSchema = z.string()
  .url('Invalid URL format')
  .refine(url => {
    try {
      const parsed = new URL(url);

      // Block localhost and internal IPs
      const forbiddenHosts = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '[::]'
      ];

      if (forbiddenHosts.includes(parsed.hostname)) {
        return false;
      }

      // Block private IP ranges
      if (
        parsed.hostname.match(/^192\.168\./) ||
        parsed.hostname.match(/^10\./) ||
        parsed.hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)
      ) {
        return false;
      }

      // Only allow http/https
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }, 'URL is forbidden or invalid');

// Purchase ID validation
export const UuidSchema = z.string().uuid('Invalid ID format');
```

#### 1.3 Update API Routes with Validation

**File**: `src/app/api/purchases/route.ts`
- Add validation before processing receipt data
- Return clear error messages on validation failure

**File**: `src/app/api/track-price/route.ts`
- Validate product_url before price checking
- Validate purchase_id format

#### 1.4 Expected Outcome
- [ ] No future dates accepted
- [ ] No negative amounts accepted
- [ ] No invalid URLs accepted
- [ ] Clear error messages shown to users

---

### Phase 2: Error Handling & Retry Logic (1-2 hours)

#### 2.1 Create Utility Functions
**File**: `src/lib/utils/error-handling.ts` (NEW FILE)
```typescript
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        onRetry?.(attempt + 1, lastError);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

export function getUserFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    // Map technical errors to user-friendly messages
    if (error.message.includes('timeout')) {
      return 'The operation took too long. Please try again.';
    }
    if (error.message.includes('network')) {
      return 'Network error. Please check your connection.';
    }
    if (error.message.includes('rate limit')) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    return 'Something went wrong. Please try again.';
  }
  return 'An unexpected error occurred.';
}
```

#### 2.2 Wrap Claude API Calls
**File**: `src/lib/claude/extract-receipt.ts`
- Add timeout (30 seconds)
- Add retry logic (3 attempts)
- Better error messages

**File**: `src/lib/claude/analyze-return.ts`
- Same improvements

**File**: `src/lib/claude/scrape-price.ts`
- Same improvements

#### 2.3 Wrap Price Tracking Calls
**File**: `src/lib/bright-data/price-tracker.ts`
- Add timeout (20 seconds)
- Add retry logic
- Fallback to Claude scraping on failure

#### 2.4 Expected Outcome
- [ ] No hanging requests (all have timeouts)
- [ ] Automatic retries on transient failures
- [ ] User-friendly error messages
- [ ] Graceful degradation

---

### Phase 3: Loading States & Progress Indicators (1 hour)

#### 3.1 Create Loading Component
**File**: `src/components/ui/loading-progress.tsx` (NEW FILE)
```typescript
'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingProgressProps {
  steps: string[]
  currentStep: number
  estimatedTime?: number
}

export function LoadingProgress({
  steps,
  currentStep,
  estimatedTime
}: LoadingProgressProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(e => e + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            {i < currentStep && <span className="text-green-600">✓</span>}
            {i === currentStep && <Loader2 className="w-4 h-4 animate-spin" />}
            {i > currentStep && <span className="text-gray-400">○</span>}
            <span className={i <= currentStep ? 'text-gray-900' : 'text-gray-400'}>
              {step}
            </span>
          </div>
        ))}
      </div>

      {estimatedTime && (
        <p className="text-sm text-gray-500 text-center">
          Estimated time: {Math.max(0, estimatedTime - elapsed)}s
        </p>
      )}
    </div>
  )
}
```

#### 3.2 Update Receipt Upload Component
**File**: `src/components/add-receipt.tsx`
- Add multi-step progress: "Uploading → Extracting → Analyzing → Complete"
- Show estimated time
- Add cancel button

#### 3.3 Update Price Tracking Dialog
**File**: `src/components/track-price-dialog.tsx`
- Show progress during price check
- Add cancel option

#### 3.4 Expected Outcome
- [ ] Users see what's happening
- [ ] Progress indicators on all AI operations
- [ ] Can cancel long operations
- [ ] Estimated time shown

---

### Phase 4: Refund Email Generation UI (4-6 hours)

#### 4.1 Create API Endpoint
**File**: `src/app/api/refund/generate/route.ts` (NEW FILE)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateRefundEmail } from '@/lib/claude/generate-refund-email';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { purchase_id, refund_type } = await request.json();

    // Get purchase with price tracking
    const { data: purchase } = await supabase
      .from('purchases')
      .select('*, price_tracking(*)')
      .eq('id', purchase_id)
      .eq('user_id', user.id)
      .single();

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    // Generate email with Claude
    const email = await generateRefundEmail(
      refund_type,
      {
        merchant: purchase.merchant_name,
        purchaseDate: purchase.purchase_date,
        originalPrice: purchase.total_amount,
        currentPrice: purchase.price_tracking?.[0]?.current_price,
        items: purchase.items,
      },
      {
        name: user.user_metadata?.name || user.email.split('@')[0],
        email: user.email,
      }
    );

    // Calculate refund amount
    const refundAmount =
      refund_type === 'price_drop'
        ? purchase.total_amount - (purchase.price_tracking?.[0]?.current_price || 0)
        : purchase.total_amount;

    // Save refund request
    const { data: refundRequest, error } = await supabase
      .from('refund_requests')
      .insert({
        purchase_id,
        user_id: user.id,
        refund_type,
        refund_amount: refundAmount,
        email_subject: email.subject,
        email_body: email.body,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      refund_request: refundRequest,
      email,
    });
  } catch (error) {
    console.error('Refund generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate refund request', details: String(error) },
      { status: 500 }
    );
  }
}
```

#### 4.2 Create Refund Dialog Component
**File**: `src/components/refund-dialog.tsx` (NEW FILE)
- Dialog to select refund type (price_drop, return, price_match)
- Show generated email preview
- Allow editing before sending
- Copy to clipboard or download

#### 4.3 Add Refund Button to Purchases
**File**: `src/components/purchases-list.tsx`
- Add "Request Refund" button to each purchase
- Show button only if:
  - Price drop detected, OR
  - Within return window, OR
  - Merchant has price match policy

#### 4.4 Create Refund Requests Page
**File**: `src/app/refunds/page.tsx` (NEW PAGE)
- List all refund requests
- Show status (draft, sent, approved, denied)
- Allow tracking outcomes

#### 4.5 Expected Outcome
- [ ] Users can generate refund emails
- [ ] AI writes professional, personalized emails
- [ ] Users can edit and copy emails
- [ ] Refund requests are tracked in database
- [ ] Feature is discoverable and easy to use

---

### Phase 5: Security Hardening (2-3 hours)

#### 5.1 Test RLS Policies
Create test script: `scripts/test-rls.ts`
```typescript
// Test that User A cannot access User B's data
import { createClient } from '@supabase/supabase-js';

async function testRLS() {
  const userA = createClient(URL, KEY, { auth: { token: TOKEN_A } });
  const userB = createClient(URL, KEY, { auth: { token: TOKEN_B } });

  // Try to access User B's purchases as User A
  const { data, error } = await userA
    .from('purchases')
    .select('*')
    .eq('user_id', USER_B_ID);

  console.assert(data.length === 0, 'RLS FAILED: Can access other user data!');
}
```

#### 5.2 Add Rate Limiting
**File**: `src/lib/utils/rate-limit.ts` (NEW FILE)
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
});

export async function checkRateLimit(request: Request): Promise<boolean> {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  return success;
}
```

Apply to all API routes.

#### 5.3 Environment Variable Audit
Run script to check for exposed secrets:
```bash
grep -r "ANTHROPIC_API_KEY" src/
grep -r "BRIGHT_DATA" src/
grep -r "process.env" src/components/
grep -r "process.env" src/app/*/page.tsx
```

#### 5.4 Expected Outcome
- [ ] RLS policies verified working
- [ ] Rate limiting on all endpoints
- [ ] No API keys exposed in client
- [ ] Security audit passed

---

### Implementation Order

**Day 1 (Morning):**
1. ✅ Phase 1: Input Validation (45 min)
2. ✅ Test validation in all API routes (30 min)

**Day 1 (Afternoon):**
3. ✅ Phase 2: Error Handling (2 hours)
4. ✅ Test error scenarios (1 hour)

**Day 2 (Morning):**
5. ✅ Phase 3: Loading States (1 hour)
6. ✅ Test UX improvements (30 min)

**Day 2 (Afternoon):**
7. ✅ Phase 4: Refund Generation (4 hours)
8. ✅ Test complete refund flow (1 hour)

**Day 3:**
9. ✅ Phase 5: Security (3 hours)
10. ✅ Final testing and deployment (2 hours)

---

## Testing Checklist After Implementation

After implementing fixes, verify:

- [ ] Can't submit receipt with future date
- [ ] Can't submit receipt with negative amount
- [ ] Can't track invalid URLs
- [ ] Long operations show progress
- [ ] Failed API calls retry automatically
- [ ] User sees friendly error messages
- [ ] Can generate refund emails
- [ ] Refund emails are high quality
- [ ] Can't access other users' data
- [ ] Rate limiting prevents abuse

---

## Testing Plan - Comprehensive Feature Analysis

### ✅ Phase 1: Authentication & Security Testing

#### 1.1 Authentication Flow
- [ ] Test signup with valid email/password
- [ ] Test signup with invalid/weak passwords
- [ ] Test signup with existing email (should fail gracefully)
- [ ] Test login with correct credentials
- [ ] Test login with incorrect credentials
- [ ] Test login with non-existent user
- [ ] Test logout functionality
- [ ] Test session persistence across page refreshes
- [ ] Test protected routes without authentication
- [ ] Test middleware redirect behavior

#### 1.2 Security Vulnerabilities
- [ ] Test SQL injection in email/password fields
- [ ] Test XSS attacks in user inputs
- [ ] Test CSRF protection on forms
- [ ] Test rate limiting on login/signup
- [ ] Test password exposure in network requests
- [ ] Verify HTTPS enforcement
- [ ] Test Row Level Security (RLS) policies in Supabase
- [ ] Test unauthorized access to other users' data
- [ ] Check for exposed API keys in client-side code
- [ ] Test session timeout behavior

---

### ✅ Phase 2: Receipt Processing & AI Integration

#### 2.1 Receipt Upload & Processing
- [ ] Test image upload (various formats: JPG, PNG, HEIC, PDF)
- [ ] Test large file uploads (>5MB, >10MB)
- [ ] Test corrupted/invalid image files
- [ ] Test text-only receipt paste
- [ ] Test empty/blank images
- [ ] Test receipts with poor image quality
- [ ] Test receipts in different languages
- [ ] Test receipts from unknown merchants
- [ ] Test duplicate receipt uploads

#### 2.2 Claude AI Receipt Extraction
- [ ] Test extraction with clear, well-formatted receipts
- [ ] Test extraction with handwritten receipts
- [ ] Test extraction with faded/low-quality receipts
- [ ] Test extraction with non-English receipts
- [ ] Verify confidence scores are accurate
- [ ] Test handling of missing merchant name
- [ ] Test handling of missing date
- [ ] Test handling of missing total amount
- [ ] Test handling of unclear item names
- [ ] Test multi-page receipts
- [ ] Test receipts with multiple merchants
- [ ] Verify extracted data matches actual receipt

#### 2.3 Receipt Confirmation Dialog
- [ ] Test editing merchant name
- [ ] Test editing purchase date
- [ ] Test editing total amount
- [ ] Test adding/removing items
- [ ] Test editing item prices
- [ ] Test validation on required fields
- [ ] Test canceling confirmation
- [ ] Test saving confirmed data
- [ ] Verify edited data persists correctly

---

### ✅ Phase 3: Return Policy Analysis

#### 3.1 Universal Return Policy Scraper
- [ ] Test with major retailers (Amazon, Walmart, Target)
- [ ] Test with small/boutique retailers
- [ ] Test with international retailers
- [ ] Test with retailers that have no return policy
- [ ] Test with retailers whose websites are down
- [ ] Test with retailers that block scraping
- [ ] Verify policy text extraction accuracy
- [ ] Verify return days extraction (30, 60, 90, etc.)
- [ ] Verify price match detection
- [ ] Test caching mechanism (should not re-scrape)
- [ ] Test policy update when stale

#### 3.2 Return Eligibility Analysis
- [ ] Test analysis with valid return window
- [ ] Test analysis with expired return window
- [ ] Test analysis on last day of return window
- [ ] Test analysis with complex policy terms
- [ ] Test analysis with conditional returns (opened vs unopened)
- [ ] Verify Claude's reasoning accuracy
- [ ] Test edge cases (same-day purchases, future dates)
- [ ] Verify recommendations are actionable

---

### ✅ Phase 4: Price Tracking System

#### 4.1 Product URL Suggestion
- [ ] Test auto-suggest for common products
- [ ] Test auto-suggest for obscure products
- [ ] Test auto-suggest with vague descriptions
- [ ] Test with products that have multiple sellers
- [ ] Verify URL suggestions are valid/accessible
- [ ] Test fallback when web search fails

#### 4.2 Price Scraping
- [ ] Test Bright Data integration with major retailers
- [ ] Test Claude web scraping for unsupported sites
- [ ] Test with products that are out of stock
- [ ] Test with products on sale
- [ ] Test with products with dynamic pricing
- [ ] Test with invalid/broken URLs
- [ ] Test with redirected URLs
- [ ] Test with products that require login
- [ ] Verify price extraction accuracy
- [ ] Test handling of different currencies

#### 4.3 Price Tracking & Monitoring
- [ ] Test starting price tracking
- [ ] Test stopping price tracking
- [ ] Test re-enabling tracking
- [ ] Verify price history is recorded correctly
- [ ] Test cron job execution
- [ ] Test price drop detection (5% threshold)
- [ ] Test price increase handling
- [ ] Test tracking multiple products per purchase
- [ ] Verify notification creation on price drops
- [ ] Test batch processing of 50+ products

#### 4.4 Price Tracking UI
- [ ] Verify tracked products display correctly
- [ ] Test price history visualization
- [ ] Test removing tracked products
- [ ] Verify "last checked" timestamps
- [ ] Test empty state (no tracked products)
- [ ] Test loading states
- [ ] Test error states

---

### ✅ Phase 5: Dashboard & Data Display

#### 5.1 Dashboard Statistics
- [ ] Verify "Total Savings" calculation is correct
- [ ] Verify "Active Purchases" count (should count price-tracked items)
- [ ] Verify "Price Drops" count
- [ ] Verify "Expiring Soon" count (within 7 days)
- [ ] Test statistics with zero purchases
- [ ] Test statistics with multiple purchases
- [ ] Test statistics update after new purchase
- [ ] Test statistics update after price drop

#### 5.2 Purchases List
- [ ] Verify purchases display in correct order (newest first)
- [ ] Test purchase details accuracy
- [ ] Test return deadline calculation
- [ ] Test display of price tracking info
- [ ] Test display of Claude analysis
- [ ] Verify item list display
- [ ] Test empty state (no purchases)
- [ ] Test pagination/limit (10 items)

#### 5.3 Forwarding Email
- [ ] Verify unique email generation
- [ ] Test copy-to-clipboard functionality
- [ ] Verify email format is correct
- [ ] Test email creation for new users

---

### ✅ Phase 6: Notifications System

#### 6.1 Notification Creation
- [ ] Test price drop notifications
- [ ] Test return expiring notifications (7, 3, 1 days before)
- [ ] Test new purchase notifications
- [ ] Verify notification priorities (urgent, high, normal)
- [ ] Test notification deduplication

#### 6.2 Notification Display
- [ ] Verify unread count badge on dashboard
- [ ] Verify notifications page displays correctly
- [ ] Test mark as read functionality
- [ ] Test filtering by read/unread
- [ ] Test sorting by priority/date
- [ ] Verify notification details accuracy
- [ ] Test empty state (no notifications)

---

### ✅ Phase 7: Email Processing (Cloudflare Worker)

#### 7.1 Email Forwarding
- [ ] Test forwarding email with receipt attachment
- [ ] Test forwarding email with inline receipt image
- [ ] Test forwarding email with PDF receipt
- [ ] Test forwarding with plain text receipt
- [ ] Test with large attachments
- [ ] Test with multiple attachments
- [ ] Test with no attachments
- [ ] Test spam filtering
- [ ] Verify webhook endpoint receives data
- [ ] Test error handling in worker

---

### ✅ Phase 8: API Endpoints Testing

#### 8.1 /api/purchases
- [ ] Test POST with valid data
- [ ] Test POST with missing required fields
- [ ] Test POST with invalid data types
- [ ] Test GET returns only user's purchases
- [ ] Test authorization (should fail without auth)
- [ ] Test rate limiting
- [ ] Verify response format
- [ ] Test error responses

#### 8.2 /api/track-price
- [ ] Test POST with valid URL
- [ ] Test POST with invalid URL
- [ ] Test POST for non-existent purchase
- [ ] Test POST for other user's purchase (should fail)
- [ ] Test DELETE functionality
- [ ] Test GET price history
- [ ] Verify error handling

#### 8.3 /api/suggest-product-url
- [ ] Test with valid product description
- [ ] Test with vague description
- [ ] Test with empty description
- [ ] Test rate limiting
- [ ] Verify suggestions quality

#### 8.4 /api/notifications
- [ ] Test GET returns only user's notifications
- [ ] Test mark as read endpoint
- [ ] Test authorization
- [ ] Verify filtering works

#### 8.5 /api/cron/check-prices
- [ ] Test cron job execution
- [ ] Test authorization with CRON_SECRET
- [ ] Test without authorization (should fail)
- [ ] Test batch processing
- [ ] Test error handling for failed price checks
- [ ] Verify notifications are created
- [ ] Test timeout handling

#### 8.6 /api/webhooks/email
- [ ] Test with valid email data
- [ ] Test with missing data
- [ ] Test with invalid format
- [ ] Test authorization
- [ ] Verify purchase creation
- [ ] Test error responses

---

### ✅ Phase 9: Database & Performance Testing

#### 9.1 Database Operations
- [ ] Test concurrent user operations
- [ ] Test large data inserts (100+ purchases)
- [ ] Verify RLS policies prevent unauthorized access
- [ ] Test database triggers (if any)
- [ ] Test foreign key constraints
- [ ] Test unique constraints (email, forward_email)
- [ ] Test CASCADE deletes (delete user → delete all data)
- [ ] Verify indexes improve query performance

#### 9.2 Performance Testing
- [ ] Test page load times (dashboard, notifications)
- [ ] Test API response times (<1s target)
- [ ] Test Claude API timeouts
- [ ] Test Bright Data timeouts
- [ ] Test large file uploads
- [ ] Test concurrent user sessions
- [ ] Monitor memory usage
- [ ] Test mobile performance

---

### ✅ Phase 10: UI/UX Testing

#### 10.1 Responsive Design
- [ ] Test on mobile (320px - 480px)
- [ ] Test on tablet (768px - 1024px)
- [ ] Test on desktop (1280px+)
- [ ] Test on ultrawide (2560px+)
- [ ] Test landscape/portrait orientation
- [ ] Verify all buttons are clickable
- [ ] Verify text is readable on all sizes

#### 10.2 User Experience
- [ ] Test loading states (spinners, skeletons)
- [ ] Test error states (error messages)
- [ ] Test empty states (no data)
- [ ] Test success messages (toast notifications)
- [ ] Verify form validation messages
- [ ] Test accessibility (keyboard navigation)
- [ ] Test screen reader compatibility
- [ ] Test color contrast ratios

#### 10.3 Landing Page
- [ ] Test all navigation links
- [ ] Test CTA buttons redirect correctly
- [ ] Test "Log in" button (should go to /login)
- [ ] Test "Sign up" buttons (should go to /signup)
- [ ] Verify smooth scrolling
- [ ] Test FAQ accordion
- [ ] Test footer links
- [ ] Test mobile menu

---

### ✅ Phase 11: Edge Cases & Error Handling

#### 11.1 Edge Cases
- [ ] Test with user who has 0 purchases
- [ ] Test with user who has 100+ purchases
- [ ] Test with purchases from 1 year ago
- [ ] Test with future-dated purchases (should fail)
- [ ] Test with negative prices (should fail)
- [ ] Test with $0 purchases
- [ ] Test with very large amounts ($999,999.99)
- [ ] Test with non-USD currencies
- [ ] Test with special characters in merchant names
- [ ] Test with very long merchant names
- [ ] Test with empty merchant names

#### 11.2 Error Recovery
- [ ] Test network failures during API calls
- [ ] Test Claude API rate limits
- [ ] Test Bright Data errors
- [ ] Test Supabase connection failures
- [ ] Test retry mechanisms
- [ ] Test graceful degradation
- [ ] Verify user-friendly error messages
- [ ] Test error logging

---

### ✅ Phase 12: Integration Testing

#### 12.1 Full User Flows
- [ ] **Flow 1: New User Onboarding**
  - Sign up → Verify email → Dashboard → View forwarding email → Test receipt
- [ ] **Flow 2: Receipt Upload**
  - Upload receipt → Review data → Confirm → View in purchases → Track price
- [ ] **Flow 3: Price Drop Detection**
  - Add purchase → Track price → Wait for price drop → Receive notification → View refund opportunity
- [ ] **Flow 4: Return Deadline Warning**
  - Add purchase → Wait until 7 days before deadline → Receive notification
- [ ] **Flow 5: Email Forwarding**
  - Forward email → Check webhook → Verify purchase created → Check notification

#### 12.2 Multi-User Testing
- [ ] Test multiple users simultaneously
- [ ] Verify data isolation between users
- [ ] Test concurrent price tracking
- [ ] Test concurrent receipt uploads

---

### ✅ Phase 13: Deployment & Production Testing

#### 13.1 Environment Variables
- [ ] Verify all env vars are set in Vercel
- [ ] Test with missing env vars (should fail gracefully)
- [ ] Verify sensitive data is not exposed
- [ ] Test local vs production configs

#### 13.2 Vercel Deployment
- [ ] Test build process
- [ ] Test deployment triggers (git push)
- [ ] Verify cron jobs are configured
- [ ] Test edge functions
- [ ] Test serverless function timeouts
- [ ] Verify logs are accessible

#### 13.3 Supabase Configuration
- [ ] Verify database is accessible
- [ ] Test connection pooling
- [ ] Verify RLS policies are enabled
- [ ] Test auth configuration
- [ ] Check storage limits

---

## Potential Issues & Improvements

### 🔴 Critical Issues to Investigate

1. **Active Purchases Count Bug** ✅ FIXED
   - Was counting all purchases instead of only tracked ones
   - Fixed in dashboard/page.tsx

2. **Authentication Security**
   - [ ] Need to test session expiration
   - [ ] Need to verify password hashing
   - [ ] Need to test brute force protection

3. **Price Tracking Reliability**
   - [ ] What happens if Bright Data is down?
   - [ ] What happens if Claude web scraping fails?
   - [ ] Need better error handling and fallbacks

4. **Return Policy Scraping**
   - [ ] May fail for sites with aggressive anti-scraping
   - [ ] Need to test caching to avoid re-scraping
   - [ ] Need to handle blocked requests gracefully

5. **Email Processing**
   - [ ] Cloudflare Worker not deployed yet
   - [ ] Need to test end-to-end email flow
   - [ ] Need spam protection

### ⚠️ Medium Priority Issues

6. **Performance Concerns**
   - [ ] Dashboard loads ALL purchases (should paginate)
   - [ ] No lazy loading of images
   - [ ] No caching of AI responses
   - [ ] Cron job processes only 50 items (what if >50?)

7. **User Experience**
   - [ ] No loading indicators during AI processing
   - [ ] No progress bars for file uploads
   - [ ] No undo functionality
   - [ ] No search/filter in purchases list
   - [ ] No sorting options

8. **Data Validation**
   - [ ] Need stricter validation on user inputs
   - [ ] Need to validate URLs before scraping
   - [ ] Need to validate dates (no future dates)
   - [ ] Need to validate amounts (no negatives)

9. **Error Handling**
   - [ ] Error messages are too technical for users
   - [ ] No retry mechanisms for failed operations
   - [ ] No fallback UI when API fails
   - [ ] Need better error logging

### 💡 Feature Improvements

10. **Receipt Processing**
    - [ ] Add support for batch uploads
    - [ ] Add receipt history/archive
    - [ ] Add ability to delete receipts
    - [ ] Add ability to edit purchases after creation
    - [ ] Add receipt templates for manual entry

11. **Price Tracking**
    - [ ] Add price history charts
    - [ ] Add price drop alerts via email
    - [ ] Add configurable price drop threshold
    - [ ] Add ability to track products without purchase
    - [ ] Add price prediction/trends

12. **Return Policy**
    - [ ] Add manual policy override
    - [ ] Add policy change detection
    - [ ] Add policy comparison tool
    - [ ] Add policy reminders

13. **Notifications**
    - [ ] Add email notifications
    - [ ] Add push notifications
    - [ ] Add notification preferences
    - [ ] Add notification history
    - [ ] Add notification snooze

14. **Refund Generation**
    - [ ] **Not implemented yet!** This is a core feature
    - [ ] Need to build refund email generation UI
    - [ ] Need to test Claude's email generation
    - [ ] Need to add email sending functionality
    - [ ] Need to track refund status

15. **Analytics & Reporting**
    - [ ] Add total savings over time graph
    - [ ] Add merchant spending breakdown
    - [ ] Add return rate by merchant
    - [ ] Add price drop frequency chart
    - [ ] Export data to CSV/PDF

### 🐛 Potential Bugs to Test

16. **Date/Time Issues**
    - [ ] Test timezone handling
    - [ ] Test daylight saving time changes
    - [ ] Test return deadline calculations across months
    - [ ] Test expiring soon with different timezones

17. **Currency Issues**
    - [ ] Test non-USD currencies
    - [ ] Test currency conversion
    - [ ] Test formatting for different locales

18. **Concurrent Operations**
    - [ ] Test multiple price checks at once
    - [ ] Test race conditions in tracking activation
    - [ ] Test duplicate prevention

19. **Memory Leaks**
    - [ ] Test long-running sessions
    - [ ] Test repeated file uploads
    - [ ] Monitor client-side memory usage

20. **Mobile Issues**
    - [ ] Test file upload from mobile camera
    - [ ] Test touch gestures
    - [ ] Test mobile keyboard issues
    - [ ] Test mobile data usage

---

## Testing Methodology

### Automated Testing (Recommended to Add)
- [ ] Add unit tests for utility functions
- [ ] Add integration tests for API routes
- [ ] Add E2E tests with Playwright/Cypress
- [ ] Add visual regression tests
- [ ] Add performance tests
- [ ] Add security scanning (OWASP)

### Manual Testing Checklist
1. Create test user account
2. Test each feature systematically
3. Document bugs with screenshots
4. Test on multiple browsers (Chrome, Firefox, Safari, Edge)
5. Test on multiple devices (mobile, tablet, desktop)
6. Test with real receipts from various merchants
7. Test edge cases and error conditions
8. Verify data persistence
9. Test performance under load
10. Verify all links and navigation

---

## Bug Reporting Template

When bugs are found, document them with:
- **Title**: Brief description
- **Severity**: Critical / High / Medium / Low
- **Steps to Reproduce**: Detailed steps
- **Expected Result**: What should happen
- **Actual Result**: What actually happens
- **Screenshots**: Visual evidence
- **Environment**: Browser, OS, Device
- **Console Errors**: Any error messages

---

## Next Steps

1. ✅ Review this comprehensive testing plan
2. [ ] Start systematic testing (Phase 1 → Phase 13)
3. [ ] Document all bugs found
4. [ ] Prioritize fixes (Critical → High → Medium → Low)
5. [ ] Implement fixes
6. [ ] Re-test fixed issues
7. [ ] Add automated tests to prevent regressions
8. [ ] Conduct user acceptance testing
9. [ ] Prepare for production launch

---

**Goal**: Create a bug-free, seamless experience where users can effortlessly recover money from purchases without any friction or errors.

**Timeline**: Allocate 2-3 days for comprehensive testing and 1-2 days for critical bug fixes.
