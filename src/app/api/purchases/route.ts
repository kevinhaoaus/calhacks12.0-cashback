import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/purchases - List all purchases for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get purchases with retailer info
    const { data: purchases, error } = await supabase
      .from('purchases')
      .select(`
        *,
        retailers (
          name,
          domain,
          logo_url,
          default_return_days,
          has_price_match
        ),
        price_tracking (
          id,
          current_price,
          price_drop_detected,
          price_drop_amount
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      purchases,
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch purchases',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/purchases - Manually add a purchase (for testing)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { receiptText } = body;

    if (!receiptText) {
      return NextResponse.json(
        { error: 'Receipt text is required' },
        { status: 400 }
      );
    }

    // Import here to avoid circular dependencies
    const { extractReceiptData } = await import('@/lib/claude/extract-receipt');
    const { analyzeReturnEligibility } = await import('@/lib/claude/analyze-return');

    // Extract receipt data with Claude
    const receiptData = await extractReceiptData(receiptText);

    // Find retailer
    const { data: retailers } = await supabase
      .from('retailers')
      .select('*')
      .ilike('name', `%${receiptData.merchant}%`)
      .limit(1);

    const retailer = retailers && retailers.length > 0 ? retailers[0] : null;

    // Calculate return deadline
    const returnDays = retailer?.default_return_days || 30;
    const purchaseDate = new Date(receiptData.date);
    const returnDeadline = new Date(purchaseDate);
    returnDeadline.setDate(returnDeadline.getDate() + returnDays);

    // Analyze return eligibility
    let claudeAnalysis = null;
    if (retailer?.return_policy_text) {
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

    // Save purchase
    const { data: purchase, error } = await supabase
      .from('purchases')
      .insert({
        user_id: user.id,
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

    if (error) throw error;

    // Create notification
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
      receiptData,
      analysis: claudeAnalysis,
    });
  } catch (error) {
    console.error('Error creating purchase:', error);
    return NextResponse.json(
      {
        error: 'Failed to create purchase',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
