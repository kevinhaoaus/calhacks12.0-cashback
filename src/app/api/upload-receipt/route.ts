import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractTextFromImage } from '@/lib/claude/ocr';
import { extractReceiptData } from '@/lib/claude/extract-receipt';
import { analyzeReturnEligibility } from '@/lib/claude/analyze-return';

/**
 * POST /api/upload-receipt - Upload and process receipt image
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

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JPG, PNG, or WebP image.' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    console.log('Processing receipt image with Claude Vision...');

    // Step 1: Extract text from image using Claude Vision
    const ocrText = await extractTextFromImage(base64, file.type);

    console.log('OCR text extracted:', ocrText);

    // Step 2: Parse receipt data from OCR text
    const receiptData = await extractReceiptData(ocrText);

    console.log('Receipt data extracted:', receiptData);

    // Step 3: Find retailer
    const { data: retailers } = await supabase
      .from('retailers')
      .select('*')
      .ilike('name', `%${receiptData.merchant}%`)
      .limit(1);

    const retailer = retailers && retailers.length > 0 ? retailers[0] : null;

    // Step 4: Calculate return deadline
    const returnDays = retailer?.default_return_days || 30;
    const purchaseDate = new Date(receiptData.date);
    const returnDeadline = new Date(purchaseDate);
    returnDeadline.setDate(returnDeadline.getDate() + returnDays);

    // Step 5: Analyze return eligibility
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

    // Step 6: Save purchase to database
    const { data: purchase, error } = await supabase
      .from('purchases')
      .insert({
        user_id: user.id,
        ocr_raw_text: ocrText,
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

    // Step 7: Create notification
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
      ocrText,
    });
  } catch (error) {
    console.error('Error processing receipt upload:', error);
    return NextResponse.json(
      {
        error: 'Failed to process receipt upload',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
