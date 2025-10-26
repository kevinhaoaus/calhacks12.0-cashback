# Refund Generator Testing Guide

## 🎯 Quick Start

**App URL**: http://localhost:3000

---

## 📋 Prerequisites

Before testing the refund generator, you need:

1. ✅ **Authenticated user** - Sign up or log in
2. ✅ **At least one purchase** - Add a receipt to test with
3. ✅ **Optional**: Price tracking on a purchase (to test price drop feature)

---

## 🧪 Test Scenarios

### Scenario 1: Full Return Request

**Goal**: Generate a professional return request email

**Steps**:
1. Navigate to http://localhost:3000
2. Log in to your account
3. Go to the Purchases/Dashboard page
4. Find any purchase in your list
5. Click the green **"Request Refund"** button
6. In the dialog, select **"Full Return"** option
7. Click **"Generate Email"**
8. Wait 3-8 seconds for AI generation
9. **Expected**: Professional email appears with:
   - Subject line
   - Body with merchant name, purchase date, and amount
   - Polite, professional tone
10. Click **"Copy All"** button
11. **Expected**: "Copied!" confirmation appears
12. Click **"Mark as Sent"**
13. **Expected**: Success message, dialog closes, page refreshes

**Validation**:
- [ ] Email includes all purchase details
- [ ] Refund amount = Total purchase amount
- [ ] Email is professional and polite
- [ ] Copy to clipboard works
- [ ] Mark as sent saves to database

---

### Scenario 2: Price Drop Adjustment

**Goal**: Request refund for price difference

**Prerequisites**:
- Purchase with original price (e.g., $299.99)
- Product now available for less (e.g., $249.99)

**Steps**:
1. Click **"Request Refund"** on a purchase
2. Select **"Price Drop Adjustment"** option
3. Enter current price: **249.99**
4. **Expected**: Shows "Potential refund: $50.00"
5. Click **"Generate Email"**
6. **Expected**: Email generated with:
   - Original price: $299.99
   - Current price: $249.99
   - Requested refund: $50.00
7. Verify email mentions price drop
8. Copy and mark as sent

**Validation**:
- [ ] Refund amount correctly calculated
- [ ] Current price must be < original price (validation)
- [ ] Email mentions specific price drop details
- [ ] Cannot submit if current_price >= original_price

**Error Testing**:
- Try entering current price = $299.99 (same as original)
  - **Expected**: Error message: "Current price must be lower..."
- Try entering current price = $350.00 (higher than original)
  - **Expected**: Error message shown

---

### Scenario 3: Price Match Request

**Goal**: Request price match with competitor

**Prerequisites**:
- Purchase from a retailer that supports price matching
  - Examples: Walmart, Target, Best Buy, Home Depot, Lowe's
  - Check database: `has_price_match = true`

**Steps**:
1. Click **"Request Refund"** on a purchase from Walmart/Target/Best Buy
2. Select **"Price Match"** option
3. **Expected**: Option is enabled (not grayed out)
4. Enter competitor price: **219.99**
5. Click **"Generate Email"**
6. **Expected**: Email includes:
   - Reference to price matching policy
   - Competitor price
   - Request for price adjustment

**Validation**:
- [ ] Only enabled for retailers with has_price_match = true
- [ ] Shows error if retailer doesn't support price match
- [ ] Email references price matching policy
- [ ] Refund amount correctly calculated

**Testing with Non-Supporting Retailer**:
1. Click **"Request Refund"** on purchase from Amazon or Apple
2. Select **"Price Match"** option
3. **Expected**: Option is disabled/grayed out
4. **Expected**: Message: "This retailer doesn't offer price matching"

---

### Scenario 4: Price Tracking Integration

**Goal**: Auto-fill current price from tracked data

**Prerequisites**:
- Purchase with active price tracking
- Price tracking has detected a price drop

**Steps**:
1. Click **"Request Refund"** on tracked purchase
2. Select **"Price Drop Adjustment"**
3. **Expected**: Shows badge: "💰 Current tracked price: $XX.XX"
4. **Expected**: "Use tracked price" button appears
5. Click **"Use tracked price ($XX.XX)"**
6. **Expected**: Current price field auto-fills
7. **Expected**: Refund amount auto-calculates
8. Continue to generate email

**Validation**:
- [ ] Tracked price displayed correctly
- [ ] Auto-fill button works
- [ ] Refund calculation uses tracked price
- [ ] Seamless UX (no manual typing needed)

---

## 🔧 API Testing (Direct)

### Test with cURL

```bash
# Get your JWT token from browser (DevTools > Application > Cookies > sb-access-token)

# 1. Generate Refund Email
curl -X POST http://localhost:3000/api/refund/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "purchase_id": "YOUR_PURCHASE_UUID",
    "refund_type": "price_drop",
    "current_price": 249.99
  }'

# Expected Response:
{
  "success": true,
  "refund_request": {
    "id": "uuid",
    "purchase_id": "uuid",
    "refund_type": "price_drop",
    "refund_amount": 50.00,
    "email_subject": "...",
    "email_body": "...",
    "status": "draft"
  },
  "generated_email": {
    "subject": "...",
    "body": "...",
    "tone": "professional"
  },
  "refund_amount": 50.00
}

# 2. Mark as Sent
curl -X PATCH http://localhost:3000/api/refund/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "refund_request_id": "REFUND_REQUEST_UUID_FROM_STEP_1"
  }'

# Expected Response:
{
  "success": true,
  "refund_request": {
    "id": "uuid",
    "email_sent": true,
    "email_sent_at": "2025-10-26T03:40:00.000Z",
    "status": "sent"
  }
}
```

---

## ✅ Validation Checklist

### API Validation
- [ ] Rejects invalid refund_type
- [ ] Rejects invalid purchase_id
- [ ] Rejects missing current_price for price_drop/price_match
- [ ] Rejects current_price >= original_price
- [ ] Rejects unauthorized requests
- [ ] Rejects cross-user access (RLS)

### UI Validation
- [ ] "Request Refund" button appears on all purchases
- [ ] Dialog opens smoothly
- [ ] All three refund types displayed
- [ ] Price match disabled for non-supporting retailers
- [ ] Current price field only shown for price_drop/price_match
- [ ] Real-time refund calculation works
- [ ] Generate button disabled while processing
- [ ] Loading spinner shows during generation
- [ ] Error messages display clearly
- [ ] Success state shows after completion
- [ ] Copy to clipboard works
- [ ] Mark as sent updates status

### Email Quality
- [ ] Subject line is professional
- [ ] Body includes all necessary details
- [ ] Tone is polite and professional
- [ ] Merchant name correct
- [ ] Purchase date formatted properly
- [ ] Amounts formatted as currency
- [ ] Grammar and spelling correct
- [ ] No technical jargon or errors

### Error Handling
- [ ] Network timeout handled (30s)
- [ ] Retry logic works (3 attempts)
- [ ] User-friendly error messages
- [ ] Claude API errors caught
- [ ] Database errors caught
- [ ] Loading state resets on error

---

## 🐛 Known Edge Cases

### Edge Case 1: Purchase Without Retailer Data
**Scenario**: Purchase created before retailer scraped
**Expected**: Still generates email, uses generic policy

### Edge Case 2: Very Old Purchase
**Scenario**: Purchase from 2+ years ago
**Expected**: Email still generates, mentions purchase age

### Edge Case 3: Small Price Drop
**Scenario**: Current price only $0.50 less
**Expected**: Generates email, but might not be worth user's time
**Note**: No minimum threshold enforced (user decides)

### Edge Case 4: Multiple Refund Requests
**Scenario**: User generates multiple emails for same purchase
**Expected**: All saved to database, each tracked separately

### Edge Case 5: No Internet/API Down
**Scenario**: Claude API unavailable
**Expected**:
- Shows error after timeout
- Suggests trying again later
- Doesn't save incomplete data

---

## 📊 Database Verification

After testing, verify data in Supabase:

```sql
-- Check refund requests created
SELECT
  rr.id,
  rr.refund_type,
  rr.refund_amount,
  rr.email_subject,
  rr.email_sent,
  rr.status,
  rr.created_at,
  p.merchant_name,
  p.total_amount
FROM refund_requests rr
JOIN purchases p ON rr.purchase_id = p.id
ORDER BY rr.created_at DESC
LIMIT 10;

-- Check notifications created
SELECT *
FROM notifications
WHERE type = 'refund_update'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected**:
- One row per refund request
- email_sent = false initially
- email_sent = true after "Mark as Sent"
- status = 'draft' → 'sent'
- One notification per refund

---

## 🎨 UI/UX Testing

### Visual Checks
- [ ] Green "Request Refund" button stands out
- [ ] Button has hover effect
- [ ] Dialog opens with smooth animation
- [ ] Refund type cards have clear icons
- [ ] Selected card highlights properly
- [ ] Input fields have proper styling
- [ ] Error messages are red/visible
- [ ] Success messages are green
- [ ] Copy button changes to "Copied!"
- [ ] Loading states show spinners
- [ ] Dialog closes smoothly

### Accessibility
- [ ] Tab navigation works
- [ ] Enter key submits forms
- [ ] Escape key closes dialog
- [ ] Focus visible on interactive elements
- [ ] Screen reader friendly labels

### Responsiveness
- [ ] Dialog works on mobile width
- [ ] Buttons stack properly on small screens
- [ ] Text remains readable
- [ ] No horizontal scroll needed

---

## 🚀 Performance Testing

### Timing Expectations
- [ ] Dialog opens: < 100ms
- [ ] Email generation: 3-8 seconds average
- [ ] Copy to clipboard: < 50ms
- [ ] Mark as sent: < 500ms
- [ ] Page refresh: < 2 seconds

### Stress Testing
- [ ] Generate 5 refunds in a row
- [ ] Generate refund with slow internet
- [ ] Generate refund with API rate limiting
- [ ] Generate while other operations running

---

## 📱 Quick Test Workflow

**5-Minute Test**:

1. **Setup** (1 min)
   - Open http://localhost:3000
   - Log in
   - Navigate to purchases

2. **Test Return** (2 min)
   - Click "Request Refund"
   - Select "Full Return"
   - Generate email
   - Verify content
   - Copy & mark sent

3. **Test Price Drop** (2 min)
   - Click "Request Refund" on another purchase
   - Select "Price Drop"
   - Enter lower price
   - Generate email
   - Verify calculation
   - Copy & mark sent

**Pass Criteria**:
✅ Both emails generated successfully
✅ Content looks professional
✅ No errors encountered
✅ Data saved to database

---

## 🎯 Success Metrics

**Phase 4 is successful if**:

- ✅ All three refund types work
- ✅ Email generation < 10 seconds
- ✅ Error rate < 1%
- ✅ Copy to clipboard works 100%
- ✅ Data persists to database
- ✅ No console errors
- ✅ Professional email quality
- ✅ Seamless user experience

---

## 📞 Need Help?

**Common Issues**:

1. **"Unauthorized" error**
   - Solution: Make sure you're logged in
   - Check JWT token in cookies

2. **"Purchase not found"**
   - Solution: Use valid purchase_id from your account
   - Check purchases table in Supabase

3. **"Failed to generate refund email"**
   - Solution: Check ANTHROPIC_API_KEY in .env.local
   - Verify Claude API is accessible
   - Check network console for errors

4. **Button doesn't appear**
   - Solution: Refresh page
   - Check browser console for errors
   - Verify component imported correctly

---

**Ready to test! Open http://localhost:3000 and start with Scenario 1** 🚀
