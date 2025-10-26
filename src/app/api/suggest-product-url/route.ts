import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productName, merchantName, purchaseId } = await request.json();

    if (!productName || !merchantName) {
      return NextResponse.json(
        { error: 'Product name and merchant name are required' },
        { status: 400 }
      );
    }

    // Verify purchase belongs to user if purchaseId provided
    if (purchaseId) {
      const { data: purchase } = await supabase
        .from('purchases')
        .select('id')
        .eq('id', purchaseId)
        .eq('user_id', user.id)
        .single();

      if (!purchase) {
        return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
      }
    }

    // Use Claude with web search to find product URLs
    const searchQuery = `${productName} ${merchantName} product page`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      tools: [
        {
          type: 'web_search_20250305' as const,
          name: 'web_search',
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Find the official product page URL for "${productName}" from ${merchantName}.

Search for: ${searchQuery}

Requirements:
1. Find the actual product page URL from the retailer's website
2. Prioritize URLs from these domains: amazon.com, walmart.com, target.com, bestbuy.com, homedepot.com, ebay.com
3. Return up to 3 most relevant product page URLs
4. Each URL should be a direct link to the specific product, not a search results page

Return your response in this exact JSON format:
{
  "suggestions": [
    {
      "url": "https://example.com/product-page",
      "title": "Product Name",
      "confidence": "high|medium|low",
      "source": "Domain name"
    }
  ]
}`,
        },
      ],
    });

    // Extract the response
    let suggestionsText = '';
    for (const block of message.content) {
      if (block.type === 'text') {
        suggestionsText += block.text;
      }
    }

    // Try to parse JSON from the response
    let suggestions: Array<{
      url: string;
      title: string;
      confidence: string;
      source: string;
    }> = [];

    try {
      // Look for JSON in the response
      const jsonMatch = suggestionsText.match(/\{[\s\S]*"suggestions"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestions = parsed.suggestions || [];
      }
    } catch (parseError) {
      console.error('Failed to parse suggestions JSON:', parseError);

      // Fallback: try to extract URLs manually
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = suggestionsText.match(urlRegex) || [];
      suggestions = urls.slice(0, 3).map(url => ({
        url: url.replace(/[,\.\)]+$/, ''), // Remove trailing punctuation
        title: productName,
        confidence: 'medium',
        source: new URL(url).hostname,
      }));
    }

    // Filter to only supported retailers
    const supportedDomains = [
      'amazon.com',
      'walmart.com',
      'target.com',
      'bestbuy.com',
      'homedepot.com',
      'ebay.com',
    ];

    const filteredSuggestions = suggestions.filter(suggestion => {
      try {
        const domain = new URL(suggestion.url).hostname.replace('www.', '');
        return supportedDomains.some(supported => domain.includes(supported));
      } catch {
        return false;
      }
    });

    return NextResponse.json({
      success: true,
      suggestions: filteredSuggestions.slice(0, 3),
      query: searchQuery,
    });
  } catch (error) {
    console.error('URL suggestion failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to suggest product URLs',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
