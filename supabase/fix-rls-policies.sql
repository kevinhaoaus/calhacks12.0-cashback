-- ============================================
-- FIX: Add INSERT policies for RLS
-- Run this in Supabase SQL Editor
-- ============================================

-- Allow users to insert their own settings
CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to insert their own purchases
CREATE POLICY "Users can insert own purchases" ON purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to insert their own refund requests
CREATE POLICY "Users can insert own refund requests" ON refund_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to insert their own notifications
CREATE POLICY "Users can insert own notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to insert price tracking for their purchases
CREATE POLICY "Users can insert own price tracking" ON price_tracking
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchases
      WHERE purchases.id = price_tracking.purchase_id
      AND purchases.user_id = auth.uid()
    )
  );

-- Also add UPDATE policies for purchases
CREATE POLICY "Users can update own purchases" ON purchases
  FOR UPDATE USING (auth.uid() = user_id);

-- And DELETE policies
CREATE POLICY "Users can delete own purchases" ON purchases
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON user_settings
  FOR DELETE USING (auth.uid() = user_id);
