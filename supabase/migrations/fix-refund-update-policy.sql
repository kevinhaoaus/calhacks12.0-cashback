-- ============================================
-- FIX: Add UPDATE policy for refund_requests
-- ============================================
-- Issue: "Mark as Sent" button fails with error:
-- "Refund request not found or update failed"
--
-- Cause: Missing RLS policy - users can INSERT but not UPDATE
--
-- Solution: Add UPDATE policy for refund_requests
-- ============================================

-- Allow users to update their own refund requests
CREATE POLICY "Users can update own refund requests" ON refund_requests
  FOR UPDATE USING (auth.uid() = user_id);
