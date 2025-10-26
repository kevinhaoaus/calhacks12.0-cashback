import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all notifications for the user
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select(`
        *,
        purchases (
          id,
          merchant_name,
          total_amount
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return NextResponse.json(
      { error: 'Failed to get notifications', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { purchase_id, type, title, message, priority } = await request.json();

    // Create notification
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        purchase_id,
        type,
        title,
        message,
        priority: priority || 'normal',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification', details: String(error) },
      { status: 500 }
    );
  }
}
