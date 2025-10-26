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
 * POST /api/purchases - Manually add a purchase
 * Supports two modes:
 * 1. Extract-only: { receiptText, extractOnly: true } - Returns extracted data without saving
 * 2. Save: { receiptData, skipExtraction: true } - Saves provided data directly
 * 3. Legacy: { receiptText } - Extracts and saves (for backward compatibility)
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
    const { receiptText, receiptData: providedData, skipExtraction, extractOnly } = body;

    // Import here to avoid circular dependencies
    const { extractReceiptData } = await import('@/lib/claude/extract-receipt');
    const { analyzeReturnEligibility } = await import('@/lib/claude/analyze-return');

    let receiptData;

    // Mode 1: Extract-only (return data without saving)
    if (extractOnly && receiptText) {
      receiptData = await extractReceiptData(receiptText);
      return NextResponse.json({
        success: true,
        extractedData: receiptData,
      });
    }

    // Mode 2: Save provided data (from confirmation dialog)
    if (skipExtraction && providedData) {
      receiptData = providedData;
    }
    // Mode 3: Legacy mode - extract and save
    else if (receiptText) {
      receiptData = await extractReceiptData(receiptText);
    } else {
      return NextResponse.json(
        { error: 'Either receiptText or receiptData is required' },
        { status: 400 }
      );
    }

    // Find retailer
    const { data: retailers } = await supabase
      .from('retailers')
      .select('*')
      .ilike('name', `%${receiptData.merchant}%`)
      .limit(1);

    let retailer = retailers && retailers.length > 0 ? retailers[0] : null;

    // If retailer doesn't have return policy text, scrape it
    if (retailer && !retailer.return_policy_text) {
      console.log(`Retailer ${retailer.name} missing policy, scraping...`);
      try {
        const { scrapeReturnPolicy } = await import('@/lib/claude/scrape-return-policy');
        const policyData = await scrapeReturnPolicy(retailer.name, retailer.domain || undefined);

        // Update retailer with scraped policy
        const { data: updatedRetailer } = await supabase
          .from('retailers')
          .update({
            return_policy_url: policyData.policy_url,
            return_policy_text: policyData.policy_text,
            default_return_days: policyData.return_days,
            has_price_match: policyData.has_price_match,
            price_match_days: policyData.price_match_days,
            policy_last_scraped: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', retailer.id)
          .select()
          .single();

        retailer = updatedRetailer || retailer;
        console.log(`Successfully scraped and saved policy for ${retailer.name}`);
      } catch (error) {
        console.error('Failed to scrape return policy:', error);
        // Continue without policy - don't fail the whole purchase
      }
    }

    // If retailer doesn't exist at all, create it with scraped policy
    if (!retailer) {
      console.log(`Creating new retailer for ${receiptData.merchant}...`);
      try {
        const { scrapeReturnPolicy } = await import('@/lib/claude/scrape-return-policy');
        const policyData = await scrapeReturnPolicy(receiptData.merchant);

        // Create new retailer
        const { data: newRetailer } = await supabase
          .from('retailers')
          .insert({
            name: receiptData.merchant,
            domain: policyData.merchant_domain,
            return_policy_url: policyData.policy_url,
            return_policy_text: policyData.policy_text,
            default_return_days: policyData.return_days,
            has_price_match: policyData.has_price_match,
            price_match_days: policyData.price_match_days,
            policy_last_scraped: new Date().toISOString(),
          })
          .select()
          .single();

        retailer = newRetailer;
        console.log(`Successfully created retailer ${receiptData.merchant} with policy`);
      } catch (error) {
        console.error('Failed to create retailer with policy:', error);
        // Continue without retailer
      }
    }

    // Calculate return deadline
    const returnDays = retailer?.default_return_days || 30;
    const purchaseDate = new Date(receiptData.date);
    const returnDeadline = new Date(purchaseDate);
    returnDeadline.setDate(returnDeadline.getDate() + returnDays);

    // Analyze return eligibility (should now work for all retailers!)
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

/**
 * DELETE /api/purchases - Delete a purchase and its associated price tracking
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const purchaseId = searchParams.get('id');

    if (!purchaseId) {
      return NextResponse.json({ error: 'Missing purchase ID' }, { status: 400 });
    }

    // Verify purchase belongs to user
    const { data: purchase } = await supabase
      .from('purchases')
      .select('*')
      .eq('id', purchaseId)
      .eq('user_id', user.id)
      .single();

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    // Delete associated price tracking first (if any)
    await supabase
      .from('price_tracking')
      .delete()
      .eq('purchase_id', purchaseId);

    // Delete the purchase
    const { error } = await supabase
      .from('purchases')
      .delete()
      .eq('id', purchaseId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete purchase:', error);
    return NextResponse.json(
      { error: 'Failed to delete purchase', details: String(error) },
      { status: 500 }
    );
  }
}
