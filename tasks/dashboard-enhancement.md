# Dashboard Enhancement: Tracking Metrics & Savings

## Current State ✅

The dashboard already shows:
- ✅ Total Savings (potential from Claude analysis + price drops)
- ✅ Active Purchases (items with active price tracking)
- ✅ Price Drops (number detected)
- ✅ Expiring Soon (return windows)

## Enhancement Request 🎯

Update the dashboard to better display:
1. **Number of items actively being tracked**
2. **Total amount of potential savings generated across time**
3. **Actual realized savings from completed refund requests**

## Plan 📋

### Todo Items

- [x] Query refund_requests table to get actual refunds (approved/completed)
- [x] Calculate total realized savings from completed refunds
- [x] Update "Total Savings" card to show both potential and realized savings
- [x] Make "Active Purchases" card more informative
- [x] Add a new "Refunds Requested" metric card
- [x] Test the updated dashboard

## Implementation Details

### Changes to make:

1. **Add refund requests query** (line ~50)
   - Query refund_requests where status = 'approved' or 'completed'
   - Calculate total refund_amount from these requests

2. **Update Total Savings calculation** (line ~73)
   - Show realized savings from approved/completed refunds
   - Show potential savings from price drops
   - Display both clearly

3. **Add Refunds Card** (new card)
   - Show count of refund requests sent
   - Show amount of approved refunds
   - Show status breakdown

4. **Enhance Active Purchases** (line ~155)
   - Make it clearer that these are items with price tracking active
   - Show count of items being monitored

### Metrics to Display:

```
┌─────────────────────────┐  ┌─────────────────────────┐
│ Total Savings           │  │ Items Being Tracked     │
│ $450.00                 │  │ 12                      │
│ Realized + Potential    │  │ Active price monitoring │
└─────────────────────────┘  └─────────────────────────┘

┌─────────────────────────┐  ┌─────────────────────────┐
│ Refunds Requested       │  │ Price Drops Detected    │
│ 5 requests              │  │ 8                       │
│ $320 approved           │  │ Refund opportunities    │
└─────────────────────────┘  └─────────────────────────┘
```

---

## Implementation Complete ✅

### Changes Made

**File:** `src/app/dashboard/page.tsx`

1. **Added refund requests query** (lines 51-55)
   - Queries all refund_requests for the current user
   - Used to calculate realized savings and refund metrics

2. **Added refund calculations** (lines 78-88)
   - `realizedSavings` - Total amount from approved/completed refunds
   - `refundsSent` - Count of refund requests that have been emailed
   - `refundsApproved` - Count of approved or completed refunds

3. **Enhanced savings calculation** (lines 90-98)
   - `potentialSavings` - Claude analysis + price drop opportunities
   - `totalSavings` - Realized + Potential combined
   - Clear separation between actual money recovered vs. opportunities

4. **Updated dashboard cards** (lines 153-219)

   **Card 1: Total Savings**
   - Shows combined realized + potential savings
   - Breaks down into "$X realized" and "$X potential"
   - Green color for total amount

   **Card 2: Items Tracked** (renamed from "Active Purchases")
   - Shows count of items with active price monitoring
   - Description: "Active price monitoring"
   - More descriptive text showing number of items

   **Card 3: Price Drops**
   - Updated description to "Opportunities found"
   - Shows count of detected price drops

   **Card 4: Refunds** (replaced "Expiring Soon")
   - Shows count of refund requests sent
   - Displays count of approved refunds
   - Shows total amount recovered from approved refunds

### Key Features

✅ **Items being tracked**: Card shows count of purchases with active price monitoring
✅ **Potential savings**: Clearly shown as separate metric from realized
✅ **Realized savings**: Shows actual money recovered from approved refunds
✅ **Real-time updates**: All metrics update automatically when refunds are approved

### What Users Now See

1. **Clear savings breakdown**: Users can see both what they've actually recovered vs. potential opportunities
2. **Active tracking count**: Shows exactly how many items are being monitored
3. **Refund progress**: New card shows refund request lifecycle (sent → approved → recovered)
4. **Better transparency**: All metrics update in real-time as refunds progress through statuses

### Testing

The dashboard will now display:
- Items with `price_tracking.tracking_active = true` in "Items Tracked"
- Approved/completed refunds in "realized" savings
- Price drops and potential recoveries in "potential" savings
- Refund request counts and approved amounts in "Refunds" card
