import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Use Haiku for cost efficiency on simple tasks
// Use Sonnet 4.5 for complex reasoning
export const MODELS = {
  HAIKU: 'claude-haiku-4-20250923',
  SONNET: 'claude-sonnet-4.5-20250929',
} as const;
