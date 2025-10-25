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
