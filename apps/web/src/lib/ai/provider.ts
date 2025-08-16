'use server';

import { LlmProvider, MockLLM, type LlmResponse } from '@repo/shared/ai/provider';

// Default fixtures for mock provider
const DEFAULT_MOCK_FIXTURES: Record<string, LlmResponse> = {
  'pay all closing costs': {
    classification: 'review',
    reasons: ['Shifts significant costs to seller', 'Modifies standard cost allocation'],
    summary: 'Buyer requires seller to pay all closing costs and requests automatic extension of option period, which are non-standard terms.'
  },
  'professionally clean': {
    classification: 'none',
    reasons: ['Standard performance obligation'],
    summary: 'Seller agrees to professionally clean the home before closing, which is a common and reasonable requirement.'
  },
  'time is of the essence': {
    classification: 'caution',
    reasons: ['Strict timing requirement'],
    summary: 'Contains strict timing requirements that could result in breach if deadlines are missed.'
  },
  'waive inspection': {
    classification: 'review',
    reasons: ['Buyer waiving critical protection', 'Increases transaction risk'],
    summary: 'Buyer waives inspection rights, which removes important protections and could lead to undiscovered issues.'
  },
  'notwithstanding': {
    classification: 'review',
    reasons: ['Overrides standard contract terms', 'Creates potential conflicts'],
    summary: 'Contains language that overrides or conflicts with other contract provisions, requiring careful legal review.'
  }
};

class OpenAIProvider implements LlmProvider {
  constructor(private apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key required');
    }
  }

  async classifySpecialProvisions({ text }: { text: string }): Promise<LlmResponse> {
    // Stub implementation - would call OpenAI API
    throw new Error('OpenAI provider not yet implemented. Use mock provider for testing.');
  }
}

class AnthropicProvider implements LlmProvider {
  constructor(private apiKey: string) {
    if (!apiKey) {
      throw new Error('Anthropic API key required');
    }
  }

  async classifySpecialProvisions({ text }: { text: string }): Promise<LlmResponse> {
    // Stub implementation - would call Anthropic API
    throw new Error('Anthropic provider not yet implemented. Use mock provider for testing.');
  }
}

export function createProvider(): LlmProvider {
  const provider = process.env.AI_PROVIDER || 'mock';
  
  switch (provider) {
    case 'mock':
      return new MockLLM(DEFAULT_MOCK_FIXTURES);
    
    case 'openai':
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        throw new Error('OPENAI_API_KEY environment variable required for OpenAI provider');
      }
      return new OpenAIProvider(openaiKey);
    
    case 'anthropic':
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable required for Anthropic provider');
      }
      return new AnthropicProvider(anthropicKey);
    
    default:
      throw new Error(`Unknown AI provider: ${provider}. Use 'mock', 'openai', or 'anthropic'.`);
  }
}