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

    // Check for price drop immediately (5% threshold)
    const originalPrice = purchase.total_amount;
    const currentPrice = priceResult.current_price;
    const priceDrop = currentPrice < originalPrice * 0.95;
    const priceDropAmount = priceDrop ? originalPrice - currentPrice : null;

    console.log('Initial price check:', {
      originalPrice,
      currentPrice,
      priceDrop,
      priceDropAmount,
      threshold: originalPrice * 0.95
    });

    // Create price tracking record
    const { data: tracking, error } = await supabase
      .from('price_tracking')
      .insert({
        purchase_id,
        product_url,
        product_name: priceResult.title,
        original_price: originalPrice,
        current_price: currentPrice,
        lowest_price: currentPrice,
        price_history: [
          {
            date: new Date().toISOString(),
            price: currentPrice,
            available: priceResult.available,
          },
        ],
        tracking_active: true,
        last_checked: new Date().toISOString(),
        price_drop_detected: priceDrop,
        price_drop_amount: priceDropAmount,
        price_drop_date: priceDrop ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;

    // Create notification if price already dropped
    if (priceDrop) {
      await supabase.from('notifications').insert({
        user_id: user.id,
        purchase_id,
        type: 'price_drop',
        title: 'Price Drop Detected!',
        message: `${priceResult.title} is now $${currentPrice.toFixed(2)} (was $${originalPrice.toFixed(2)}). Save $${priceDropAmount!.toFixed(2)}!`,
        priority: 'high',
      });
    }

    return NextResponse.json({
      success: true,
      tracking,
      initial_price: currentPrice,
      price_drop_detected: priceDrop,
      price_drop_amount: priceDropAmount,
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
