import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractTextFromImage } from '@/lib/claude/ocr';
import { extractReceiptData } from '@/lib/claude/extract-receipt';
import { analyzeReturnEligibility } from '@/lib/claude/analyze-return';

/**
 * POST /api/upload-receipt - Upload and process receipt image
 * Now returns extracted data without saving (for confirmation flow)
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
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JPG, PNG, WebP, or PDF file.' },
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

    // Return extracted data for user confirmation (don't save yet)
    return NextResponse.json({
      success: true,
      extractedData: receiptData,
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
