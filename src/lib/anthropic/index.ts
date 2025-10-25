import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Use Haiku for cost efficiency on simple tasks
// Use Sonnet 3.5 for complex reasoning
export const MODELS = {
  HAIKU: 'claude-3-5-haiku-20241022',
  SONNET: 'claude-3-5-sonnet-20241022',
} as const;
