import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const notificationId = id;

    // Verify notification belongs to user
    const { data: notification } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .single();

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Mark as read
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification as read', details: String(error) },
      { status: 500 }
    );
  }
}
