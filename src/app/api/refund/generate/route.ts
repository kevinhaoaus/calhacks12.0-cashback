import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateRefundEmail } from '@/lib/claude/generate-refund-email';
import { RefundTypeSchema, UuidSchema, formatValidationError } from '@/lib/validation/schemas';
import { retryWithTimeout, logError } from '@/lib/utils/error-handling';
import { z } from 'zod';

/**
 * POST /api/refund/generate - Generate a refund request email
 *
 * Body:
 * - purchase_id: UUID of the purchase
 * - refund_type: 'price_drop' | 'return' | 'price_match'
 * - current_price?: number (required for price_drop and price_match)
 *
 * Returns:
 * - Generated email subject and body
 * - Saved refund request record
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { purchase_id, refund_type, current_price } = body;

    // Validate inputs
    try {
      UuidSchema.parse(purchase_id);
      RefundTypeSchema.parse(refund_type);

      // Validate current_price if provided
      if (current_price !== undefined && current_price !== null) {
        if (typeof current_price !== 'number' || current_price < 0) {
          return NextResponse.json(
            { error: 'current_price must be a positive number' },
            { status: 400 }
          );
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          formatValidationError(error),
          { status: 400 }
        );
      }
      throw error;
    }

    // Fetch purchase details
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select(`
        *,
        retailers (
          name,
          domain,
          return_policy_text,
          has_price_match,
          price_match_days
        ),
        price_tracking (
          current_price,
          price_drop_amount,
          price_drop_detected
        )
      `)
      .eq('id', purchase_id)
      .eq('user_id', user.id)
      .single();

    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      );
    }

    // Validate refund type is appropriate for this purchase
    if (refund_type === 'price_drop' || refund_type === 'price_match') {
      if (!current_price) {
        return NextResponse.json(
          { error: 'current_price is required for price_drop and price_match refund types' },
          { status: 400 }
        );
      }
      if (current_price >= purchase.total_amount) {
        return NextResponse.json(
          { error: 'Current price must be lower than original price for refund eligibility' },
          { status: 400 }
        );
      }
    }

    if (refund_type === 'price_match' && !purchase.retailers?.has_price_match) {
      return NextResponse.json(
        { error: 'This retailer does not offer price matching' },
        { status: 400 }
      );
    }

    // Get user profile for email generation
    const { data: profile } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Prepare data for email generation
    const purchaseData = {
      merchant: purchase.merchant_name,
      purchaseDate: purchase.purchase_date,
      orderNumber: undefined, // Can be added later if we capture order numbers
      originalPrice: purchase.total_amount,
      currentPrice: current_price,
      items: purchase.items || [],
    };

    const userInfo = {
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer',
      email: user.email || profile?.forward_email || '',
    };

    // Generate refund email using Claude AI with timeout and retry
    const generatedEmail = await retryWithTimeout(
      () => generateRefundEmail(refund_type, purchaseData, userInfo),
      {
        maxRetries: 3,
        baseDelay: 1000,
        timeoutMs: 30000,
        onRetry: (attempt, error) => {
          console.log(`Retrying refund email generation (attempt ${attempt}): ${error.message}`);
        }
      }
    );

    // Calculate refund amount
    const refundAmount = refund_type === 'return'
      ? purchase.total_amount
      : purchase.total_amount - (current_price || 0);

    // Save refund request to database
    const { data: refundRequest, error: refundError } = await supabase
      .from('refund_requests')
      .insert({
        purchase_id,
        user_id: user.id,
        refund_type,
        refund_amount: refundAmount,
        reason: `${refund_type === 'price_drop' ? 'Price dropped' : refund_type === 'price_match' ? 'Price match request' : 'Return request'} - Generated via FairVal`,
        email_subject: generatedEmail.subject,
        email_body: generatedEmail.body,
        status: 'draft',
      })
      .select()
      .single();

    if (refundError) {
      logError(refundError, 'saveRefundRequest');
      throw new Error('Failed to save refund request');
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      purchase_id,
      type: 'refund_update',
      title: 'Refund Email Generated',
      message: `Your ${refund_type.replace('_', ' ')} request email for ${purchase.merchant_name} is ready to send.`,
      priority: 'normal',
    });

    return NextResponse.json({
      success: true,
      refund_request: refundRequest,
      generated_email: generatedEmail,
      refund_amount: refundAmount,
    });
  } catch (error) {
    logError(error, 'generateRefundEmail');
    console.error('Error generating refund email:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate refund email',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/refund/generate - Mark refund email as sent
 *
 * Body:
 * - refund_request_id: UUID of the refund request
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { refund_request_id } = body;

    // Validate refund_request_id
    try {
      UuidSchema.parse(refund_request_id);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          formatValidationError(error),
          { status: 400 }
        );
      }
      throw error;
    }

    // Update refund request status
    const { data: refundRequest, error } = await supabase
      .from('refund_requests')
      .update({
        email_sent: true,
        email_sent_at: new Date().toISOString(),
        status: 'sent',
        updated_at: new Date().toISOString(),
      })
      .eq('id', refund_request_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !refundRequest) {
      return NextResponse.json(
        { error: 'Refund request not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      refund_request: refundRequest,
    });
  } catch (error) {
    console.error('Error marking refund as sent:', error);
    return NextResponse.json(
      {
        error: 'Failed to update refund status',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
