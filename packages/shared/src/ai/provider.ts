export type LlmResponse = { 
  classification: 'none' | 'caution' | 'review'; 
  reasons: string[]; 
  summary: string;
};

export interface LlmProvider {
  classifySpecialProvisions(input: { text: string }): Promise<LlmResponse>;
}

export class MockLLM implements LlmProvider {
  constructor(private fixtures: Record<string, LlmResponse>) {}
  
  async classifySpecialProvisions({ text }: { text: string }): Promise<LlmResponse> {
    // Naive keying by includes(); in real tests, pass exact strings
    const key = Object.keys(this.fixtures).find(k => text.includes(k));
    if (!key) {
      return { 
        classification: 'none', 
        reasons: [], 
        summary: '' 
      };
    }
    return this.fixtures[key];
  }
}