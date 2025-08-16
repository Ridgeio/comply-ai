import { LlmProvider, LlmResponse } from './provider';

const RED_FLAGS = [
  /time is of the essence/i,
  /automatic(?:ally)?.*extension|extend.*automatically/i,
  /seller.*pay.*all closing costs/i,
  /notwithstanding.*paragraph/i,
  /supersede/i,
  /waive inspection/i,
];

export function staticHeuristics(text: string): { hints: string[] } {
  const hints: string[] = [];
  for (const r of RED_FLAGS) {
    if (r.test(text)) {
      hints.push(r.source);
    }
  }
  return { hints };
}

export async function analyzeSpecialProvisions(
  text: string, 
  llm: LlmProvider
): Promise<LlmResponse & { hints: string[] }> {
  const { hints } = staticHeuristics(text);
  const ai = await llm.classifySpecialProvisions({ text });
  
  // Ensure we never down-grade below 'caution' if hints exist
  const order = ['none', 'caution', 'review'] as const;
  const max = (a: typeof order[number], b: typeof order[number]) => 
    order[Math.max(order.indexOf(a), order.indexOf(b))];
  
  const classification = hints.length ? max(ai.classification, 'caution') : ai.classification;
  
  return { 
    ...ai, 
    classification, 
    reasons: [...ai.reasons, ...hints], 
    summary: ai.summary, 
    hints 
  };
}