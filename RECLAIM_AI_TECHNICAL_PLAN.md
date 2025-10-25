# Reclaim.AI - Technical Implementation Plan
## MVP: Post-Purchase Money Recovery System

**Target Prizes:** Anthropic (Claude) + Bright Data + Postman
**Timeline:** 2-3 weeks
**Tech Stack:** Next.js 14, TypeScript, Supabase, Cloudflare Workers

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Tech Stack Details](#tech-stack-details)
3. [Database Schema](#database-schema)
4. [Implementation Phases](#implementation-phases)
5. [Anthropic Integration](#anthropic-integration)
6. [Bright Data Integration](#bright-data-integration)
7. [Postman Integration](#postman-integration)
8. [API Endpoints](#api-endpoints)
9. [Deployment Guide](#deployment-guide)
10. [Demo Flow for Judges](#demo-flow-for-judges)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│                    (Next.js 14 + TypeScript)                     │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS API ROUTES                          │
│  /api/purchases  /api/analyze  /api/track-price  /api/refund    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                ↓                ↓                ↓
    ┌───────────────┐  ┌──────────────┐  ┌──────────────┐
    │   ANTHROPIC   │  │ BRIGHT DATA  │  │   POSTMAN    │
    │  Claude API   │  │ Web Scraper  │  │  Flows API   │
    │               │  │              │  │              │
    │ • Parse OCR   │  │ • Track      │  │ • Workflow   │
    │ • Analyze     │  │   Prices     │  │   Orchestr.  │
    │ • Generate    │  │ • Scrape     │  │ • API Docs   │
    │   Messages    │  │   Policies   │  │              │
    └───────────────┘  └──────────────┘  └──────────────┘
                                 │
                                 ↓
                    ┌────────────────────────┐
                    │   SUPABASE POSTGRES    │
                    │  + Real-time + Auth    │
                    └────────────────────────┘
                                 │
                                 ↓
                    ┌────────────────────────┐
                    │  CLOUDFLARE WORKERS    │
                    │   Email Processing     │
                    └────────────────────────┘
```

---

## Tech Stack Details

### Frontend
```json
{
  "framework": "Next.js 14.2.x",
  "language": "TypeScript 5.x",
  "styling": "Tailwind CSS 3.x",
  "components": "shadcn/ui",
  "state": "React Query (TanStack Query)",
  "forms": "React Hook Form + Zod"
}
```

### Backend
```json
{
  "runtime": "Node.js 20.x",
  "api": "Next.js API Routes",
  "database": "Supabase PostgreSQL",
  "auth": "Supabase Auth",
  "email-processing": "Cloudflare Workers",
  "ocr": "Mindee Receipt OCR API"
}
```

### AI & Data Services
```json
{
  "ai": "Anthropic Claude Sonnet 4.5",
  "scraping": "Bright Data Web Scraper API",
  "workflow": "Postman Flows",
  "email": "Resend API"
}
```

---

## Database Schema

### Complete SQL Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- RETAILERS TABLE (Pre-populated data)
-- ============================================
CREATE TABLE retailers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  domain VARCHAR(255),
  
  -- Return policy
  default_return_days INTEGER DEFAULT 30,
  return_policy_url TEXT,
  return_policy_text TEXT,
  policy_last_scraped TIMESTAMP,
  
  -- Price matching
  has_price_match BOOLEAN DEFAULT false,
  price_match_days INTEGER,
  
  -- Metadata
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_retailers_name ON retailers(name);
CREATE INDEX idx_retailers_domain ON retailers(domain);

-- ============================================
-- USER SETTINGS
-- ============================================
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Email forwarding
  forward_email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  
  -- Notification preferences
  notification_preferences JSONB DEFAULT '{
    "email": true,
    "days_before_expiry": [7, 3, 1],
    "price_drop_threshold": 5.0,
    "daily_digest": true
  }'::jsonb,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_user_settings_user ON user_settings(user_id);
CREATE UNIQUE INDEX idx_forward_email ON user_settings(forward_email);

-- ============================================
-- PURCHASES
-- ============================================
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Receipt metadata
  receipt_email_id VARCHAR(255),
  receipt_image_url TEXT,
  ocr_raw_text TEXT,
  
  -- Purchase details
  merchant_name VARCHAR(255) NOT NULL,
  retailer_id INTEGER REFERENCES retailers(id),
  purchase_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Items
  items JSONB, -- [{name, price, quantity, product_url}]
  
  -- Return tracking
  return_deadline DATE,
  return_window_days INTEGER,
  return_status VARCHAR(50) DEFAULT 'active', -- active, returned, expired, kept
  
  -- AI analysis
  claude_analysis JSONB, -- Claude's reasoning about return eligibility
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_return_status CHECK (return_status IN ('active', 'returned', 'expired', 'kept'))
);

-- Indexes
CREATE INDEX idx_purchases_user ON purchases(user_id);
CREATE INDEX idx_purchases_return_deadline ON purchases(return_deadline);
CREATE INDEX idx_purchases_merchant ON purchases(merchant_name);
CREATE INDEX idx_purchases_date ON purchases(purchase_date DESC);

-- ============================================
-- PRICE TRACKING
-- ============================================
CREATE TABLE price_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  
  -- Product info
  product_url TEXT NOT NULL,
  product_name VARCHAR(500),
  
  -- Price history
  original_price DECIMAL(10,2) NOT NULL,
  current_price DECIMAL(10,2),
  lowest_price DECIMAL(10,2),
  price_history JSONB DEFAULT '[]'::jsonb, -- [{date, price, available}]
  
  -- Tracking status
  tracking_active BOOLEAN DEFAULT true,
  last_checked TIMESTAMP,
  check_frequency_hours INTEGER DEFAULT 24,
  
  -- Price drop alerts
  price_drop_detected BOOLEAN DEFAULT false,
  price_drop_amount DECIMAL(10,2),
  price_drop_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_price_tracking_purchase ON price_tracking(purchase_id);
CREATE INDEX idx_price_tracking_active ON price_tracking(tracking_active) WHERE tracking_active = true;
CREATE INDEX idx_price_tracking_last_checked ON price_tracking(last_checked);

-- ============================================
-- REFUND REQUESTS
-- ============================================
CREATE TABLE refund_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Request details
  refund_type VARCHAR(50) NOT NULL, -- price_drop, return, price_match
  refund_amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  
  -- Generated content (by Claude)
  email_subject VARCHAR(500),
  email_body TEXT,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, approved, denied, completed
  retailer_response TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_refund_type CHECK (refund_type IN ('price_drop', 'return', 'price_match')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'sent', 'approved', 'denied', 'completed'))
);

CREATE INDEX idx_refund_requests_purchase ON refund_requests(purchase_id);
CREATE INDEX idx_refund_requests_user ON refund_requests(user_id);
CREATE INDEX idx_refund_requests_status ON refund_requests(status);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  
  -- Notification details
  type VARCHAR(50) NOT NULL, -- return_expiring, price_drop, refund_update
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Status
  read BOOLEAN DEFAULT false,
  sent_via_email BOOLEAN DEFAULT false,
  
  -- Priority
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_notification_type CHECK (type IN ('return_expiring', 'price_drop', 'refund_update', 'system')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- API LOGS (for Postman monitoring)
-- ============================================
CREATE TABLE api_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Request details
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Response
  status_code INTEGER,
  response_time_ms INTEGER,
  
  -- Integration tracking
  external_service VARCHAR(50), -- 'claude', 'bright_data', 'postman'
  external_cost DECIMAL(10,4), -- Track API costs
  
  -- Error tracking
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX idx_api_logs_service ON api_logs(external_service);
CREATE INDEX idx_api_logs_created ON api_logs(created_at DESC);

-- ============================================
-- SEED DATA: Top 20 Retailers
-- ============================================
INSERT INTO retailers (name, domain, default_return_days, has_price_match, price_match_days) VALUES
  ('Amazon', 'amazon.com', 30, false, 0),
  ('Walmart', 'walmart.com', 90, true, 7),
  ('Target', 'target.com', 90, true, 14),
  ('Best Buy', 'bestbuy.com', 15, true, 15),
  ('Home Depot', 'homedepot.com', 90, true, 90),
  ('Lowe''s', 'lowes.com', 90, true, 90),
  ('Costco', 'costco.com', 90, false, 0),
  ('Macy''s', 'macys.com', 30, false, 0),
  ('Nike', 'nike.com', 60, false, 0),
  ('Apple', 'apple.com', 14, false, 0),
  ('Nordstrom', 'nordstrom.com', 45, false, 0),
  ('Gap', 'gap.com', 45, false, 0),
  ('Old Navy', 'oldnavy.com', 45, false, 0),
  ('REI', 'rei.com', 365, false, 0),
  ('Sephora', 'sephora.com', 60, false, 0),
  ('Ulta', 'ulta.com', 60, false, 0),
  ('Zappos', 'zappos.com', 365, false, 0),
  ('Chewy', 'chewy.com', 365, false, 0),
  ('Wayfair', 'wayfair.com', 30, false, 0),
  ('IKEA', 'ikea.com', 365, false, 0);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own price tracking" ON price_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM purchases 
      WHERE purchases.id = price_tracking.purchase_id 
      AND purchases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own refund requests" ON refund_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);
```

---

## Implementation Phases

### Phase 1: Foundation (Days 1-3)
- [ ] Initialize Next.js 14 project with TypeScript
- [ ] Set up Supabase project and database
- [ ] Configure Supabase Auth
- [ ] Deploy database schema
- [ ] Set up basic UI with shadcn/ui
- [ ] Implement user authentication flow

### Phase 2: Email Processing (Days 4-6)
- [ ] Set up Cloudflare Email Routing
- [ ] Create Cloudflare Worker for email parsing
- [ ] Integrate Mindee Receipt OCR API
- [ ] Build email forwarding address generation
- [ ] Test email → database pipeline

### Phase 3: Anthropic Integration (Days 7-9)
- [ ] Set up Anthropic Claude API
- [ ] Build receipt parsing with Claude
- [ ] Implement return eligibility analysis
- [ ] Create refund email generation
- [ ] Add multi-step reasoning for policy interpretation

### Phase 4: Bright Data Integration (Days 10-13)
- [ ] Set up Bright Data account
- [ ] Build price tracking system
- [ ] Scrape return policies (one-time bulk)
- [ ] Implement daily price check cron
- [ ] Create price drop detection logic

### Phase 5: Postman Integration (Days 14-16)
- [ ] Create comprehensive API collection
- [ ] Build Postman Flow for demo
- [ ] Set up API monitoring
- [ ] Generate public API documentation
- [ ] Create developer-facing examples

### Phase 6: Polish & Demo (Days 17-21)
- [ ] Build notification system
- [ ] Create dashboard with analytics
- [ ] Write demo script
- [ ] Record demo video
- [ ] Prepare pitch deck

---

## Anthropic Integration

### Setup

```bash
npm install @anthropic-ai/sdk
```

```typescript
// lib/anthropic.ts
import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Use Haiku for cost efficiency on simple tasks
// Use Sonnet 4.5 for complex reasoning
export const MODELS = {
  HAIKU: 'claude-haiku-4-20250923',
  SONNET: 'claude-sonnet-4.5-20250929',
} as const;
```

### Use Case 1: Receipt Data Extraction

```typescript
// lib/claude/extract-receipt.ts
import { anthropic, MODELS } from '@/lib/anthropic';

interface ReceiptData {
  merchant: string;
  date: string;
  total: number;
  currency: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  confidence: number;
}

export async function extractReceiptData(
  ocrText: string
): Promise<ReceiptData> {
  const message = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a receipt data extraction expert. Extract structured data from this receipt OCR text.

OCR Text:
${ocrText}

Return a JSON object with this exact structure:
{
  "merchant": "store name",
  "date": "YYYY-MM-DD",
  "total": 0.00,
  "currency": "USD",
  "items": [
    {"name": "item name", "price": 0.00, "quantity": 1}
  ],
  "confidence": 0.95
}

Rules:
- merchant: Identify the store name (e.g., "Target", "Walmart")
- date: Extract purchase date in ISO format
- total: Final total amount paid
- items: List all purchased items with prices
- confidence: Your confidence in the extraction (0-1)

Return ONLY the JSON, no explanation.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return JSON.parse(content.text);
}
```

### Use Case 2: Return Policy Analysis

```typescript
// lib/claude/analyze-return.ts
import { anthropic, MODELS } from '@/lib/anthropic';

interface ReturnAnalysis {
  is_returnable: boolean;
  days_remaining: number;
  return_deadline: string;
  reasoning: string;
  confidence: number;
  recommendations: string[];
}

export async function analyzeReturnEligibility(
  purchase: {
    merchant: string;
    purchaseDate: string;
    totalAmount: number;
    items: any[];
  },
  returnPolicy: string
): Promise<ReturnAnalysis> {
  const today = new Date().toISOString().split('T')[0];

  const message = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `You are a return policy expert. Analyze if this purchase is still returnable.

PURCHASE DETAILS:
- Merchant: ${purchase.merchant}
- Purchase Date: ${purchase.purchaseDate}
- Today's Date: ${today}
- Total Amount: $${purchase.totalAmount}
- Items: ${JSON.stringify(purchase.items)}

RETURN POLICY:
${returnPolicy}

Analyze the return eligibility and provide:
1. Can this purchase still be returned?
2. How many days remain in the return window?
3. What is the exact return deadline?
4. Detailed reasoning based on the policy
5. Recommendations for the user

Return JSON:
{
  "is_returnable": true/false,
  "days_remaining": number,
  "return_deadline": "YYYY-MM-DD",
  "reasoning": "detailed explanation",
  "confidence": 0.95,
  "recommendations": ["action 1", "action 2"]
}

Return ONLY the JSON.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return JSON.parse(content.text);
}
```

### Use Case 3: Refund Email Generation

```typescript
// lib/claude/generate-refund-email.ts
import { anthropic, MODELS } from '@/lib/anthropic';

interface RefundEmail {
  subject: string;
  body: string;
  tone: string;
}

export async function generateRefundEmail(
  refundType: 'price_drop' | 'return' | 'price_match',
  purchase: {
    merchant: string;
    purchaseDate: string;
    orderNumber?: string;
    originalPrice: number;
    currentPrice?: number;
    items: any[];
  },
  userInfo: {
    name: string;
    email: string;
  }
): Promise<RefundEmail> {
  const message = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `You are a professional email writer specializing in customer service requests. Generate a refund request email.

REFUND TYPE: ${refundType}
MERCHANT: ${purchase.merchant}
PURCHASE DATE: ${purchase.purchaseDate}
${purchase.orderNumber ? `ORDER NUMBER: ${purchase.orderNumber}` : ''}
ORIGINAL PRICE: $${purchase.originalPrice}
${purchase.currentPrice ? `CURRENT PRICE: $${purchase.currentPrice}` : ''}
CUSTOMER NAME: ${userInfo.name}
CUSTOMER EMAIL: ${userInfo.email}

Write a professional, polite email requesting a ${refundType === 'price_drop' ? 'price adjustment' : 'return authorization'}.

Guidelines:
- Be polite and professional
- Reference specific policy terms if applicable
- Include all relevant details (order number, dates, amounts)
- Request specific action
- Thank them for their time
- Keep it concise (under 200 words)

Return JSON:
{
  "subject": "email subject line",
  "body": "email body with newlines",
  "tone": "professional|friendly|formal"
}

Return ONLY the JSON.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return JSON.parse(content.text);
}
```

### Use Case 4: Multi-Step Reasoning Chain

```typescript
// lib/claude/smart-analysis.ts
import { anthropic, MODELS } from '@/lib/anthropic';

/**
 * Advanced: Use Claude to orchestrate multiple steps
 * This showcases Claude's reasoning capabilities for the hackathon
 */
export async function performSmartPurchaseAnalysis(purchase: any) {
  const message = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are an AI assistant helping users maximize savings on their purchases. Analyze this purchase and provide comprehensive recommendations.

PURCHASE:
${JSON.stringify(purchase, null, 2)}

Perform the following analysis:

1. RETURN WINDOW ANALYSIS
   - Calculate days remaining until return deadline
   - Assess urgency level
   - Identify any risks (approaching deadline, special conditions)

2. PRICE OPTIMIZATION
   - Is this likely to go on sale soon? (consider seasonality, merchant patterns)
   - Should the user wait for a better price or return now?
   - Calculate potential savings scenarios

3. ACTION RECOMMENDATIONS
   - What should the user do RIGHT NOW?
   - What should they monitor?
   - What are the risks of each action?

4. MONEY RECOVERY POTENTIAL
   - Estimate total potential savings
   - Rank actions by ROI
   - Calculate success probability for each action

Think step by step. Return a JSON with your analysis:
{
  "return_analysis": {...},
  "price_analysis": {...},
  "recommendations": [...],
  "money_recovery_potential": {...},
  "reasoning_chain": ["step 1", "step 2", ...]
}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return JSON.parse(content.text);
}
```

### Cost Optimization

```typescript
// lib/claude/cost-tracking.ts

/**
 * Track Claude API costs for transparency
 */
export function estimateClaudeCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = {
    'claude-haiku-4-20250923': {
      input: 0.25 / 1_000_000,  // $0.25 per MTok
      output: 1.25 / 1_000_000, // $1.25 per MTok
    },
    'claude-sonnet-4.5-20250929': {
      input: 3.0 / 1_000_000,   // $3 per MTok
      output: 15.0 / 1_000_000, // $15 per MTok
    },
  };

  const rates = pricing[model as keyof typeof pricing];
  if (!rates) return 0;

  return inputTokens * rates.input + outputTokens * rates.output;
}

// Log costs to database
export async function logClaudeUsage(
  endpoint: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  userId?: string
) {
  const cost = estimateClaudeCost(model, inputTokens, outputTokens);

  // Insert into api_logs table
  const { error } = await supabase.from('api_logs').insert({
    endpoint,
    external_service: 'claude',
    external_cost: cost,
    user_id: userId,
    response_time_ms: 0, // Add actual response time tracking
  });

  if (error) console.error('Failed to log Claude usage:', error);
}
```

---

## Bright Data Integration

### Setup

```bash
npm install axios
```

```typescript
// lib/bright-data.ts
import axios from 'axios';

const BRIGHT_DATA_API_KEY = process.env.BRIGHT_DATA_API_KEY!;
const BRIGHT_DATA_CUSTOMER_ID = process.env.BRIGHT_DATA_CUSTOMER_ID!;

export const brightDataClient = axios.create({
  baseURL: 'https://api.brightdata.com',
  headers: {
    Authorization: `Bearer ${BRIGHT_DATA_API_KEY}`,
    'Content-Type': 'application/json',
  },
});
```

### Use Case 1: Price Tracking Setup

```typescript
// lib/bright-data/price-tracker.ts
import { brightDataClient } from '@/lib/bright-data';

interface PriceCheckResult {
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
```

### Use Case 2: Bulk Price Checking (Cron Job)

```typescript
// app/api/cron/check-prices/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkProductPrice } from '@/lib/bright-data/price-tracker';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for cron
);

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all active price tracking records that need checking
    const { data: trackingRecords, error } = await supabase
      .from('price_tracking')
      .select('*, purchases!inner(user_id, merchant_name)')
      .eq('tracking_active', true)
      .lt(
        'last_checked',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      ) // Last checked > 24h ago
      .limit(50); // Process 50 at a time to avoid timeouts

    if (error) throw error;

    const results = [];

    for (const record of trackingRecords || []) {
      try {
        const priceResult = await checkProductPrice(record.product_url);

        // Update price history
        const priceHistory = record.price_history || [];
        priceHistory.push({
          date: priceResult.timestamp,
          price: priceResult.current_price,
          available: priceResult.available,
        });

        // Detect price drop
        const priceDrop =
          priceResult.current_price < record.original_price * 0.95; // 5% drop threshold

        // Update database
        await supabase
          .from('price_tracking')
          .update({
            current_price: priceResult.current_price,
            lowest_price: Math.min(
              record.lowest_price || Infinity,
              priceResult.current_price
            ),
            price_history: priceHistory,
            last_checked: new Date().toISOString(),
            price_drop_detected: priceDrop,
            price_drop_amount: priceDrop
              ? record.original_price - priceResult.current_price
              : null,
            price_drop_date: priceDrop ? new Date().toISOString() : null,
          })
          .eq('id', record.id);

        // Create notification if price dropped
        if (priceDrop) {
          await supabase.from('notifications').insert({
            user_id: record.purchases.user_id,
            purchase_id: record.purchase_id,
            type: 'price_drop',
            title: 'Price Drop Detected!',
            message: `${record.product_name} dropped from $${record.original_price} to $${priceResult.current_price}. Save $${(record.original_price - priceResult.current_price).toFixed(2)}!`,
            priority: 'high',
          });
        }

        results.push({ success: true, id: record.id });
      } catch (error) {
        console.error(`Failed to check price for ${record.id}:`, error);
        results.push({ success: false, id: record.id, error: String(error) });
      }

      // Rate limiting: wait 2 seconds between requests
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return NextResponse.json({
      success: true,
      checked: results.length,
      results,
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: String(error) },
      { status: 500 }
    );
  }
}
```

### Use Case 3: Return Policy Scraping (One-time Bulk)

```typescript
// scripts/scrape-return-policies.ts
import { brightDataClient } from '@/lib/bright-data';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ReturnPolicyScrapeResult {
  url: string;
  policy_text: string;
  return_days: number;
  has_price_match: boolean;
}

/**
 * Scrape return policy from a retailer's website
 */
async function scrapeReturnPolicy(
  retailerUrl: string
): Promise<ReturnPolicyScrapeResult> {
  // Use Bright Data's Web Scraper API
  const response = await brightDataClient.post('/web-scraper/v1/trigger', {
    zone: 'unblocker', // Use unblocking proxy
    url: retailerUrl,
    format: 'json',
    parse: {
      policy_text: {
        selector: 'main, .policy-content, .return-policy',
        type: 'text',
      },
    },
  });

  const jobId = response.data.job_id;

  // Poll for results
  let attempts = 0;
  while (attempts < 20) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const resultResponse = await brightDataClient.get(
      `/web-scraper/v1/job/${jobId}`
    );

    if (resultResponse.data.status === 'complete') {
      const policyText = resultResponse.data.data.policy_text;

      // Use Claude to extract structured info from policy text
      const analysis = await analyzeReturnPolicyWithClaude(policyText);

      return {
        url: retailerUrl,
        policy_text: policyText,
        return_days: analysis.return_days,
        has_price_match: analysis.has_price_match,
      };
    }

    attempts++;
  }

  throw new Error('Timeout scraping return policy');
}

/**
 * Bulk scrape all retailer return policies
 */
export async function bulkScrapeReturnPolicies() {
  // Get all retailers without scraped policies
  const { data: retailers } = await supabase
    .from('retailers')
    .select('*')
    .is('return_policy_text', null);

  for (const retailer of retailers || []) {
    try {
      // Construct return policy URL (common patterns)
      const policyUrl =
        retailer.return_policy_url ||
        `https://${retailer.domain}/returns` ||
        `https://${retailer.domain}/return-policy`;

      const result = await scrapeReturnPolicy(policyUrl);

      // Update database
      await supabase
        .from('retailers')
        .update({
          return_policy_text: result.policy_text,
          return_policy_url: result.url,
          default_return_days: result.return_days,
          has_price_match: result.has_price_match,
          policy_last_scraped: new Date().toISOString(),
        })
        .eq('id', retailer.id);

      console.log(`✓ Scraped policy for ${retailer.name}`);

      // Rate limit: wait 10 seconds between retailers
      await new Promise((resolve) => setTimeout(resolve, 10000));
    } catch (error) {
      console.error(`✗ Failed to scrape ${retailer.name}:`, error);
    }
  }
}

// Helper function using Claude
async function analyzeReturnPolicyWithClaude(policyText: string) {
  // Implementation using Claude to extract structured data
  // ... (similar to earlier Claude examples)
  return {
    return_days: 30,
    has_price_match: false,
  };
}
```

### Cost Estimation & Optimization

```typescript
// lib/bright-data/cost-tracking.ts

/**
 * Bright Data pricing (approximate):
 * - Datasets API: ~$0.001 - $0.01 per request
 * - Web Scraper API: ~$0.002 - $0.02 per page
 * - Residential proxies: ~$15/GB
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

// Log to database
export async function logBrightDataUsage(
  endpoint: string,
  service: string,
  cost: number,
  userId?: string
) {
  await supabase.from('api_logs').insert({
    endpoint,
    external_service: 'bright_data',
    external_cost: cost,
    user_id: userId,
  });
}

// Optimization: Cache results
export async function getCachedPrice(productUrl: string) {
  const { data } = await supabase
    .from('price_tracking')
    .select('current_price, last_checked')
    .eq('product_url', productUrl)
    .single();

  // Return cached if checked within last 12 hours
  if (
    data &&
    new Date(data.last_checked).getTime() > Date.now() - 12 * 60 * 60 * 1000
  ) {
    return data.current_price;
  }

  return null; // Need to fetch fresh data
}
```

---

## Postman Integration

### Setup

1. **Create Postman Account**
   - Sign up at postman.com
   - Get API key from Account Settings

2. **Install Postman CLI** (for automation)
```bash
npm install -g postman
```

### Use Case 1: API Collection

Create a comprehensive Postman Collection documenting all your APIs:

**Collection Structure:**
```
Reclaim.AI API Collection
├── Authentication
│   ├── POST /api/auth/signup
│   ├── POST /api/auth/login
│   └── POST /api/auth/logout
├── Purchases
│   ├── GET /api/purchases
│   ├── GET /api/purchases/:id
│   ├── POST /api/purchases (forward email)
│   └── DELETE /api/purchases/:id
├── Price Tracking
│   ├── POST /api/track-price
│   ├── GET /api/price-history/:purchaseId
│   └── DELETE /api/track-price/:id
├── Refund Requests
│   ├── POST /api/refund/generate
│   ├── GET /api/refund/:id
│   └── PATCH /api/refund/:id/status
├── Notifications
│   ├── GET /api/notifications
│   └── PATCH /api/notifications/:id/read
└── Analytics
    ├── GET /api/analytics/savings
    └── GET /api/analytics/dashboard
```

**Export Collection JSON:**

```json
{
  "info": {
    "name": "Reclaim.AI API",
    "description": "Post-purchase money recovery platform API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{access_token}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "base_url",
      "value": "https://reclaim-ai.vercel.app/api",
      "type": "string"
    },
    {
      "key": "access_token",
      "value": "",
      "type": "string"
    }
  ],
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Sign Up",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"securepassword\",\n  \"name\": \"John Doe\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{base_url}}/auth/signup",
              "host": ["{{base_url}}"],
              "path": ["auth", "signup"]
            }
          }
        }
      ]
    }
  ]
}
```

### Use Case 2: Postman Flow (Visual Workflow)

Create a Postman Flow to demonstrate the complete workflow:

**Flow: Receipt Processing Pipeline**

```
┌─────────────────┐
│  Receive Email  │
│  (Webhook)      │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Extract OCR    │
│  (Mindee API)   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Parse Receipt  │
│  (Claude API)   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Save Purchase  │
│  (Supabase)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Start Price    │
│  Tracking       │
│  (Bright Data)  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Send           │
│  Confirmation   │
└─────────────────┘
```

**Actual Postman Flow JSON:**

```json
{
  "name": "Receipt Processing Pipeline",
  "blocks": [
    {
      "id": "receive_email",
      "type": "request",
      "config": {
        "request": {
          "method": "POST",
          "url": "{{base_url}}/webhooks/email",
          "body": {
            "mode": "raw",
            "raw": "{{email_data}}"
          }
        }
      },
      "next": "extract_ocr"
    },
    {
      "id": "extract_ocr",
      "type": "request",
      "config": {
        "request": {
          "method": "POST",
          "url": "https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict",
          "headers": {
            "Authorization": "Token {{mindee_api_key}}"
          },
          "body": {
            "mode": "formdata",
            "formdata": [
              {
                "key": "document",
                "value": "{{receive_email.response.attachment}}",
                "type": "file"
              }
            ]
          }
        }
      },
      "next": "parse_with_claude"
    },
    {
      "id": "parse_with_claude",
      "type": "request",
      "config": {
        "request": {
          "method": "POST",
          "url": "https://api.anthropic.com/v1/messages",
          "headers": {
            "x-api-key": "{{anthropic_api_key}}",
            "anthropic-version": "2023-06-01"
          },
          "body": {
            "mode": "raw",
            "raw": "{\"model\": \"claude-sonnet-4.5-20250929\", \"max_tokens\": 1024, \"messages\": [{\"role\": \"user\", \"content\": \"Extract receipt data: {{extract_ocr.response.document.inference.prediction.raw_text}}\"}]}"
          }
        }
      },
      "next": "save_purchase"
    },
    {
      "id": "save_purchase",
      "type": "request",
      "config": {
        "request": {
          "method": "POST",
          "url": "{{base_url}}/purchases",
          "body": {
            "mode": "raw",
            "raw": "{{parse_with_claude.response.content[0].text}}"
          }
        }
      },
      "next": "track_price"
    },
    {
      "id": "track_price",
      "type": "request",
      "config": {
        "request": {
          "method": "POST",
          "url": "{{base_url}}/track-price",
          "body": {
            "mode": "raw",
            "raw": "{\"purchase_id\": \"{{save_purchase.response.id}}\"}"
          }
        }
      }
    }
  ]
}
```

### Use Case 3: API Monitoring

```typescript
// lib/postman/monitoring.ts
import axios from 'axios';

const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY!;

const postmanClient = axios.create({
  baseURL: 'https://api.getpostman.com',
  headers: {
    'X-Api-Key': POSTMAN_API_KEY,
  },
});

/**
 * Create a monitor for API health checks
 */
export async function createAPIMonitor() {
  const response = await postmanClient.post('/monitors', {
    monitor: {
      name: 'Reclaim.AI API Health',
      collection: 'YOUR_COLLECTION_ID', // From Postman
      environment: 'YOUR_ENVIRONMENT_ID',
      schedule: {
        cron: '0 */1 * * *', // Every hour
        timezone: 'America/Los_Angeles',
      },
    },
  });

  return response.data;
}

/**
 * Get monitor results
 */
export async function getMonitorResults(monitorId: string) {
  const response = await postmanClient.get(`/monitors/${monitorId}/runs`);
  return response.data;
}

/**
 * Send monitor data to dashboard
 */
export async function syncMonitoringToDashboard() {
  const monitors = await postmanClient.get('/monitors');

  for (const monitor of monitors.data.monitors) {
    const runs = await getMonitorResults(monitor.id);

    // Calculate uptime
    const totalRuns = runs.length;
    const successfulRuns = runs.filter((r: any) => r.status === 'finished')
      .length;
    const uptime = (successfulRuns / totalRuns) * 100;

    // Store in your database
    await supabase.from('api_health').insert({
      monitor_name: monitor.name,
      uptime_percentage: uptime,
      total_runs: totalRuns,
      last_checked: new Date().toISOString(),
    });
  }
}
```

### Use Case 4: Public API Documentation

```typescript
// app/api/docs/route.ts
import { NextResponse } from 'next/server';

/**
 * Serve public API documentation
 */
export async function GET() {
  const documentation = {
    openapi: '3.0.0',
    info: {
      title: 'Reclaim.AI API',
      version: '1.0.0',
      description: 'Post-purchase money recovery platform',
      contact: {
        name: 'API Support',
        url: 'https://reclaim-ai.vercel.app',
      },
    },
    servers: [
      {
        url: 'https://reclaim-ai.vercel.app/api',
        description: 'Production server',
      },
    ],
    paths: {
      '/purchases': {
        get: {
          summary: 'List all purchases',
          description: 'Returns a list of all purchases for the authenticated user',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Purchase',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Purchase: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            merchant_name: { type: 'string' },
            purchase_date: { type: 'string', format: 'date' },
            total_amount: { type: 'number' },
            return_deadline: { type: 'string', format: 'date' },
          },
        },
      },
    },
  };

  return NextResponse.json(documentation);
}
```

---

## API Endpoints

### Complete API Route Structure

```
app/api/
├── auth/
│   ├── signup/route.ts
│   ├── login/route.ts
│   └── logout/route.ts
├── purchases/
│   ├── route.ts (GET, POST)
│   ├── [id]/route.ts (GET, DELETE)
│   └── analyze/route.ts (POST)
├── track-price/
│   ├── route.ts (POST, DELETE)
│   └── [id]/route.ts (GET)
├── refund/
│   ├── generate/route.ts (POST)
│   ├── [id]/route.ts (GET, PATCH)
│   └── send/route.ts (POST)
├── notifications/
│   ├── route.ts (GET)
│   └── [id]/read/route.ts (PATCH)
├── webhooks/
│   ├── email/route.ts (POST)
│   └── cloudflare/route.ts (POST)
├── cron/
│   ├── check-prices/route.ts (GET)
│   └── send-reminders/route.ts (GET)
└── docs/
    └── route.ts (GET)
```

### Key Endpoint Examples

**1. POST /api/purchases - Create Purchase from Email**

```typescript
// app/api/purchases/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractReceiptData } from '@/lib/claude/extract-receipt';
import { analyzeReturnEligibility } from '@/lib/claude/analyze-return';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ocr_text, receipt_image_url } = await request.json();

    // Step 1: Extract receipt data with Claude
    const receiptData = await extractReceiptData(ocr_text);

    // Step 2: Find or create retailer
    let retailer = await supabase
      .from('retailers')
      .select('*')
      .ilike('name', `%${receiptData.merchant}%`)
      .single();

    // Step 3: Calculate return deadline
    const returnDays = retailer.data?.default_return_days || 30;
    const purchaseDate = new Date(receiptData.date);
    const returnDeadline = new Date(purchaseDate);
    returnDeadline.setDate(returnDeadline.getDate() + returnDays);

    // Step 4: Get return policy and analyze
    let claudeAnalysis = null;
    if (retailer.data?.return_policy_text) {
      claudeAnalysis = await analyzeReturnEligibility(
        {
          merchant: receiptData.merchant,
          purchaseDate: receiptData.date,
          totalAmount: receiptData.total,
          items: receiptData.items,
        },
        retailer.data.return_policy_text
      );
    }

    // Step 5: Save purchase to database
    const { data: purchase, error } = await supabase
      .from('purchases')
      .insert({
        user_id: user.id,
        receipt_image_url,
        ocr_raw_text: ocr_text,
        merchant_name: receiptData.merchant,
        retailer_id: retailer.data?.id,
        purchase_date: receiptData.date,
        total_amount: receiptData.total,
        currency: receiptData.currency,
        items: receiptData.items,
        return_deadline: returnDeadline.toISOString(),
        return_window_days: returnDays,
        claude_analysis: claudeAnalysis,
      })
      .select()
      .single();

    if (error) throw error;

    // Step 6: Create notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      purchase_id: purchase.id,
      type: 'return_expiring',
      title: 'New Purchase Tracked',
      message: `Your ${receiptData.merchant} purchase ($${receiptData.total}) will expire on ${returnDeadline.toLocaleDateString()}`,
      priority: 'normal',
    });

    return NextResponse.json({
      success: true,
      purchase,
    });
  } catch (error) {
    console.error('Purchase creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase', details: String(error) },
      { status: 500 }
    );
  }
}
```

**2. POST /api/track-price - Start Price Tracking**

```typescript
// app/api/track-price/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkProductPrice } from '@/lib/bright-data/price-tracker';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { purchase_id, product_url } = await request.json();

    // Verify purchase belongs to user
    const { data: purchase } = await supabase
      .from('purchases')
      .select('*')
      .eq('id', purchase_id)
      .eq('user_id', user.id)
      .single();

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    // Get initial price
    const priceResult = await checkProductPrice(product_url);

    // Create price tracking record
    const { data: tracking, error } = await supabase
      .from('price_tracking')
      .insert({
        purchase_id,
        product_url,
        product_name: priceResult.title,
        original_price: purchase.total_amount,
        current_price: priceResult.current_price,
        lowest_price: priceResult.current_price,
        price_history: [
          {
            date: new Date().toISOString(),
            price: priceResult.current_price,
            available: priceResult.available,
          },
        ],
        tracking_active: true,
        last_checked: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      tracking,
      initial_price: priceResult.current_price,
    });
  } catch (error) {
    console.error('Price tracking failed:', error);
    return NextResponse.json(
      { error: 'Failed to start price tracking', details: String(error) },
      { status: 500 }
    );
  }
}
```

**3. POST /api/refund/generate - Generate Refund Email**

```typescript
// app/api/refund/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateRefundEmail } from '@/lib/claude/generate-refund-email';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
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

    // Get user info
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

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
        ? purchase.total_amount -
          (purchase.price_tracking?.[0]?.current_price || 0)
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

---

## Deployment Guide

### Prerequisites

```bash
# Required accounts:
# 1. Vercel (vercel.com)
# 2. Supabase (supabase.com)
# 3. Cloudflare (cloudflare.com)
# 4. Anthropic (anthropic.com)
# 5. Bright Data (brightdata.com)
# 6. Postman (postman.com)
```

### Step 1: Environment Variables

Create `.env.local`:

```bash
# App
NEXT_PUBLIC_APP_URL=https://reclaim-ai.vercel.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# Bright Data
BRIGHT_DATA_API_KEY=your_api_key
BRIGHT_DATA_CUSTOMER_ID=your_customer_id

# Postman
POSTMAN_API_KEY=your_postman_key
POSTMAN_COLLECTION_ID=your_collection_id

# Mindee OCR
MINDEE_API_KEY=your_mindee_key

# Resend (Email)
RESEND_API_KEY=re_xxx

# Cloudflare Workers
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# Cron Secret
CRON_SECRET=random_secret_string_here
```

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Set environment variables
vercel env add ANTHROPIC_API_KEY
# ... add all other env vars
```

### Step 3: Set Up Cloudflare Worker

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create worker
wrangler init email-processor

# Deploy worker
wrangler deploy
```

**Worker Code (wrangler.toml):**

```toml
name = "reclaim-email-processor"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
API_URL = "https://reclaim-ai.vercel.app/api/webhooks/email"
```

**Worker Script (src/index.ts):**

```typescript
export default {
  async email(message: any, env: any) {
    // Parse email
    const from = message.from;
    const subject = message.headers.get('subject');
    const body = await message.text();

    // Extract forwarding address
    const forwardTo = message.to;

    // Forward to API
    const response = await fetch(env.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: forwardTo,
        subject,
        body,
        attachments: message.attachments || [],
      }),
    });

    return response;
  },
};
```

### Step 4: Configure Cron Jobs

In `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-prices",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/send-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### Step 5: Database Migrations

```bash
# Run SQL schema on Supabase
supabase db push

# Or manually in Supabase SQL Editor
# Copy-paste the entire schema from earlier section
```

---

## Demo Flow for Judges

### 5-Minute Demo Script

**1. Introduction (30 seconds)**
"Reclaim.AI automatically recovers money from your online purchases by tracking return deadlines and price drops. We use Anthropic Claude for intelligent analysis, Bright Data for price tracking, and Postman for workflow orchestration."

**2. Live Demo (3 minutes)**

**Step 1: Email Forwarding Setup**
- Show user dashboard
- Display generated forwarding email: `user123@reclaim.ai`
- "Users forward receipts to this address"

**Step 2: Receipt Processing (Anthropic)**
- Forward a real receipt email
- Show Claude extracting data in real-time
- Display parsed JSON: merchant, date, items, total
- Show Claude analyzing return policy: "30 days remaining, returnable"

**Step 3: Price Tracking (Bright Data)**
- Click "Track Price" button
- Show product URL input
- Display Bright Data fetching current price
- Show price comparison: "Original: $49.99, Current: $44.99"
- Show alert: "Price dropped $5! Potential refund available"

**Step 4: Refund Generation (Anthropic + Postman)**
- Click "Generate Refund Request"
- Show Claude generating personalized email
- Display Postman Flow orchestrating the workflow
- Show final email ready to send

**Step 5: Dashboard & Analytics**
- Show total potential savings: "$127.50"
- Display upcoming expirations
- Show Postman API monitoring dashboard

**3. Technical Highlights (1 minute)**
- "Claude Sonnet 4.5 for multi-step reasoning"
- "Bright Data scrapes 50 retailers daily"
- "Postman orchestrates 5-step workflow"
- "All documented in public API collection"

**4. Q&A (30 seconds)**

### Demo Data Preparation

```typescript
// scripts/seed-demo-data.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function seedDemoData(userId: string) {
  // Create sample purchases
  const demoPurchases = [
    {
      user_id: userId,
      merchant_name: 'Nike',
      purchase_date: '2025-01-15',
      total_amount: 129.99,
      return_deadline: '2025-03-16',
      items: [
        { name: 'Nike Air Max', price: 129.99, quantity: 1 },
      ],
    },
    {
      user_id: userId,
      merchant_name: 'Best Buy',
      purchase_date: '2025-01-20',
      total_amount: 499.99,
      return_deadline: '2025-02-04',
      items: [
        { name: 'Sony Headphones WH-1000XM5', price: 499.99, quantity: 1 },
      ],
    },
  ];

  for (const purchase of demoPurchases) {
    await supabase.from('purchases').insert(purchase);
  }

  // Create sample price tracking with drops
  await supabase.from('price_tracking').insert({
    purchase_id: 'xxx',
    product_url: 'https://nike.com/air-max',
    original_price: 129.99,
    current_price: 119.99,
    price_drop_detected: true,
    price_drop_amount: 10.0,
  });
}
```

---

## Cost Analysis

### Per-User Monthly Cost (MVP)

```typescript
// Calculate costs for demo
const costBreakdown = {
  // Anthropic Claude
  claude: {
    receipts_per_month: 10,
    tokens_per_receipt: 2000, // input + output
    cost_per_receipt: 0.0001, // ~$0.0001
    monthly: 10 * 0.0001, // $0.001
  },

  // Bright Data
  brightData: {
    price_checks_per_day: 5,
    days_per_month: 30,
    cost_per_check: 0.005,
    monthly: 5 * 30 * 0.005, // $0.75
  },

  // Mindee OCR
  mindee: {
    receipts_per_month: 10,
    cost_per_receipt: 0.01,
    monthly: 10 * 0.01, // $0.10
  },

  // Resend Email
  resend: {
    emails_per_month: 20,
    cost_per_email: 0.0001,
    monthly: 20 * 0.0001, // $0.002
  },

  // Infrastructure (Vercel + Supabase)
  infrastructure: {
    monthly: 0, // Free tier
  },

  // Total per user
  total: 0.001 + 0.75 + 0.10 + 0.002, // ~$0.85/user/month
};

console.log('Cost per user/month:', costBreakdown.total);
console.log('Break-even at: $5/month subscription');
console.log('Margin: 83%');
```

---

## Next Steps After Hackathon

1. **Scale Price Tracking:**
   - Implement intelligent scheduling (check popular items more frequently)
   - Add product image recognition
   - Support more retailers (currently 20, target 100+)

2. **Enhanced Claude Integration:**
   - Multi-language support
   - Voice-based receipt input
   - Predictive analysis: "This item usually goes on sale in 2 weeks"

3. **Automated Refund Filing:**
   - Direct API integrations with major retailers
   - Browser automation for stores without APIs
   - Track success rates by merchant

4. **Mobile App:**
   - Native iOS/Android apps
   - Push notifications
   - Receipt scanning via camera

5. **Monetization:**
   - Freemium: 5 receipts/month free
   - Premium: $4.99/month unlimited
   - Enterprise: White-label for banks/credit cards

---

## Troubleshooting

### Common Issues

**1. Claude API Rate Limits**
```typescript
// Implement exponential backoff
async function retryWithBackoff(fn: Function, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.status === 429) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

**2. Bright Data IP Blocks**
```typescript
// Use different proxy types
const proxyConfig = {
  residential: true, // More expensive but harder to block
  session_duration: 300, // 5 minutes
  country: 'us',
};
```

**3. Supabase RLS Issues**
```sql
-- Debug: Check if policies are working
SELECT * FROM purchases WHERE user_id = auth.uid();

-- If empty, verify auth.uid() is set:
SELECT auth.uid();
```

---

## Resources

- [Anthropic Claude API Docs](https://docs.anthropic.com)
- [Bright Data Documentation](https://docs.brightdata.com)
- [Postman Learning Center](https://learning.postman.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js 14 Documentation](https://nextjs.org/docs)

---

## Success Metrics for Hackathon

**Technical Excellence:**
- ✅ Multi-service integration (3+ APIs)
- ✅ Real-time data processing
- ✅ Production-ready architecture
- ✅ Comprehensive API documentation

**Innovation:**
- ✅ Novel application of AI for financial recovery
- ✅ Automated workflow orchestration
- ✅ Smart policy interpretation

**Execution:**
- ✅ Working MVP in 2-3 weeks
- ✅ Live demo with real data
- ✅ Measurable user value ($$$)

---

**Good luck building Reclaim.AI! 🚀**
