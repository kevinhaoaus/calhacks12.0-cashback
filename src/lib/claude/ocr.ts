import { anthropic, MODELS } from '@/lib/anthropic';

/**
 * Extract text from an image using Claude Vision API
 * Supports receipt images in JPG, PNG, HEIC formats
 */
export async function extractTextFromImage(
  imageData: string,
  mimeType: string
): Promise<string> {
  // Remove data URL prefix if present
  const base64Data = imageData.includes('base64,')
    ? imageData.split('base64,')[1]
    : imageData;

  const message = await anthropic.messages.create({
    model: MODELS.SONNET, // Vision requires Sonnet
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64Data,
            },
          },
          {
            type: 'text',
            text: `Please extract all text from this receipt image. Include:
- Store/merchant name
- Date and time
- All item names and prices
- Subtotal, tax, and total
- Payment method (if visible)

Return the text exactly as it appears on the receipt, preserving the layout as much as possible.`,
          },
        ],
      },
    ],
  });

  const textContent = message.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response');
  }

  return textContent.text;
}

/**
 * Extract text from a PDF receipt
 * For now, converts first page to image and processes
 */
export async function extractTextFromPDF(
  pdfBase64: string
): Promise<string> {
  // For PDFs, we'll need to use a different approach
  // Claude Vision doesn't directly support PDFs
  // Options:
  // 1. Use pdf-parse library to extract text directly
  // 2. Convert PDF to image first (requires additional library)
  //
  // For simplicity, we'll use pdf-parse if text is embedded
  // or ask user to provide image-based receipts

  throw new Error('PDF processing requires pdf-parse library. Please use image uploads for now.');
}
