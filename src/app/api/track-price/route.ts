import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkProductPrice } from '@/lib/bright-data/price-tracker';
import { ProductUrlSchema, UuidSchema, formatValidationError } from '@/lib/validation/schemas';
import { z } from 'zod';

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
    const { purchase_id, product_url } = body;

    // Validate inputs
    try {
      UuidSchema.parse(purchase_id);
      ProductUrlSchema.parse(product_url);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          formatValidationError(error),
          { status: 400 }
        );
      }
      throw error;
    }

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

    // Get initial price using Bright Data (URL is now validated)
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all price tracking for user's purchases
    const { data: tracking, error } = await supabase
      .from('price_tracking')
      .select(`
        *,
        purchases!inner(
          id,
          merchant_name,
          user_id
        )
      `)
      .eq('purchases.user_id', user.id)
      .eq('tracking_active', true);

    if (error) throw error;

    return NextResponse.json({ tracking });
  } catch (error) {
    console.error('Failed to get price tracking:', error);
    return NextResponse.json(
      { error: 'Failed to get price tracking', details: String(error) },
      { status: 500 }
    );
  }
}

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
    const trackingId = searchParams.get('id');

    if (!trackingId) {
      return NextResponse.json({ error: 'Missing tracking ID' }, { status: 400 });
    }

    // Validate tracking ID format
    try {
      UuidSchema.parse(trackingId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid tracking ID format' },
          { status: 400 }
        );
      }
      throw error;
    }

    // Verify tracking belongs to user's purchase
    const { data: tracking } = await supabase
      .from('price_tracking')
      .select(`
        *,
        purchases!inner(user_id)
      `)
      .eq('id', trackingId)
      .eq('purchases.user_id', user.id)
      .single();

    if (!tracking) {
      return NextResponse.json({ error: 'Tracking not found' }, { status: 404 });
    }

    // Actually delete the tracking record
    const { error } = await supabase
      .from('price_tracking')
      .delete()
      .eq('id', trackingId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete price tracking:', error);
    return NextResponse.json(
      { error: 'Failed to delete price tracking', details: String(error) },
      { status: 500 }
    );
  }
}
