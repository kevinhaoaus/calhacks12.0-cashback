import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractReceiptData } from '@/lib/claude/extract-receipt';
import { analyzeReturnEligibility } from '@/lib/claude/analyze-return';

/**
 * Webhook endpoint for receiving forwarded emails
 * This will be called by Cloudflare Email Worker
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, to, subject, text, html, attachments } = body;

    console.log('Received email webhook:', { from, to, subject });

    // Extract user from forwarding email
    // Format: user-id@reclaim.ai or similar
    const forwardEmail = to;

    const supabase = await createClient();

    // Find user by forwarding email
    const { data: userSettings, error: userError } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('forward_email', forwardEmail)
      .single();

    if (userError || !userSettings) {
      console.error('User not found for email:', forwardEmail);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Extract receipt text from email
    // In a real implementation, you would:
    // 1. Use Mindee OCR API for attachments
    // 2. Parse HTML for embedded receipts
    // 3. Extract text from plain text email

    const receiptText = text || html || 'No text found';

    // Use Claude to extract receipt data
    console.log('Extracting receipt data with Claude...');
    const receiptData = await extractReceiptData(receiptText);

    console.log('Receipt data extracted:', receiptData);

    // Find or get retailer info
    let retailer = null;
    const { data: retailers } = await supabase
      .from('retailers')
      .select('*')
      .ilike('name', `%${receiptData.merchant}%`)
      .limit(1);

    if (retailers && retailers.length > 0) {
      retailer = retailers[0];
    }

    // Calculate return deadline
    const returnDays = retailer?.default_return_days || 30;
    const purchaseDate = new Date(receiptData.date);
    const returnDeadline = new Date(purchaseDate);
    returnDeadline.setDate(returnDeadline.getDate() + returnDays);

    // Analyze return eligibility if we have policy
    let claudeAnalysis = null;
    if (retailer?.return_policy_text) {
      console.log('Analyzing return eligibility...');
      claudeAnalysis = await analyzeReturnEligibility(
        {
          merchant: receiptData.merchant,
          purchaseDate: receiptData.date,
          totalAmount: receiptData.total,
          items: receiptData.items,
        },
        retailer.return_policy_text
      );
    }

    // Save purchase to database
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        user_id: userSettings.user_id,
        receipt_email_id: `${from}-${Date.now()}`,
        ocr_raw_text: receiptText,
        merchant_name: receiptData.merchant,
        retailer_id: retailer?.id,
        purchase_date: receiptData.date,
        total_amount: receiptData.total,
        currency: receiptData.currency,
        items: receiptData.items,
        return_deadline: returnDeadline.toISOString().split('T')[0],
        return_window_days: returnDays,
        claude_analysis: claudeAnalysis,
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Error saving purchase:', purchaseError);
      throw purchaseError;
    }

    // Create notification for user
    await supabase.from('notifications').insert({
      user_id: userSettings.user_id,
      purchase_id: purchase.id,
      type: 'return_expiring',
      title: 'New Purchase Tracked',
      message: `Your ${receiptData.merchant} purchase ($${receiptData.total}) will expire on ${returnDeadline.toLocaleDateString()}`,
      priority: 'normal',
    });

    console.log('Purchase saved successfully:', purchase.id);

    return NextResponse.json({
      success: true,
      purchase_id: purchase.id,
      merchant: receiptData.merchant,
      total: receiptData.total,
      return_deadline: returnDeadline.toISOString(),
    });
  } catch (error) {
    console.error('Email webhook error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process email',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
