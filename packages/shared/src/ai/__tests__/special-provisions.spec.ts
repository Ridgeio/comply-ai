import { describe, it, expect } from 'vitest';
import { analyzeSpecialProvisions, staticHeuristics } from '../specialProvisions';
import { MockLLM } from '../provider';
import type { LlmResponse } from '../provider';

describe('Special Provisions AI Analysis', () => {
  describe('staticHeuristics', () => {
    it('should detect red flag patterns', () => {
      const text = 'Buyer requires seller to pay all closing costs and automatic extension of option period.';
      const { hints } = staticHeuristics(text);
      
      expect(hints.some(h => h.includes('seller') && h.includes('pay'))).toBe(true);
      expect(hints.some(h => h.includes('automatic') || h.includes('extend'))).toBe(true);
    });

    it('should return empty hints for benign text', () => {
      const text = 'Seller to professionally clean home prior to closing.';
      const { hints } = staticHeuristics(text);
      
      expect(hints).toHaveLength(0);
    });

    it('should detect multiple red flags', () => {
      const text = 'Time is of the essence. Notwithstanding paragraph 7, buyer waive inspection rights.';
      const { hints } = staticHeuristics(text);
      
      expect(hints).toContain('time is of the essence');
      expect(hints).toContain('notwithstanding.*paragraph');
      expect(hints).toContain('waive inspection');
      expect(hints.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('analyzeSpecialProvisions with MockLLM', () => {
    const fixtures: Record<string, LlmResponse> = {
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
      }
    };

    const mockLLM = new MockLLM(fixtures);

    it('should classify high-risk provisions as review', async () => {
      const text = 'Buyer requires seller to pay all closing costs and extend option period automatically.';
      const result = await analyzeSpecialProvisions(text, mockLLM);
      
      expect(result.classification).toBe('review');
      expect(result.reasons).toContain('Shifts significant costs to seller');
      expect(result.reasons).toContain('Modifies standard cost allocation');
      // Check for either form of the automatic extension pattern
      expect(result.reasons.some(r => r.includes('automatic') || r.includes('extend'))).toBe(true); // From static hints
      expect(result.summary).toContain('non-standard terms');
      expect(result.hints.some(h => h.includes('automatic') || h.includes('extend'))).toBe(true);
    });

    it('should classify benign provisions appropriately', async () => {
      const text = 'Seller to professionally clean home prior to closing.';
      const result = await analyzeSpecialProvisions(text, mockLLM);
      
      expect(['none', 'caution']).toContain(result.classification);
      expect(result.reasons).toContain('Standard performance obligation');
      expect(result.summary).toContain('common and reasonable requirement');
      expect(result.hints).toHaveLength(0);
    });

    it('should upgrade classification when static hints are present', async () => {
      const text = 'Time is of the essence for all dates in this contract.';
      const result = await analyzeSpecialProvisions(text, mockLLM);
      
      // Even if LLM says 'caution', static hint ensures at least 'caution'
      expect(result.classification).toBe('caution');
      // Either AI reason or static hint
      expect(result.reasons.some(r => r.includes('Strict timing') || r.includes('time is of the essence'))).toBe(true);
      expect(result.hints.some(h => h.includes('time is of the essence'))).toBe(true);
    });

    it('should handle text with no matches in fixtures', async () => {
      const text = 'Some other provision text not in fixtures.';
      const result = await analyzeSpecialProvisions(text, mockLLM);
      
      expect(result.classification).toBe('none');
      expect(result.reasons).toHaveLength(0);
      expect(result.summary).toBe('');
      expect(result.hints).toHaveLength(0);
    });

    it('should combine AI reasons with static hints', async () => {
      const text = 'Buyer requires seller to pay all closing costs. Automatic extension applies. Time is of the essence.';
      const result = await analyzeSpecialProvisions(text, mockLLM);
      
      expect(result.classification).toBe('review');
      // AI reasons
      expect(result.reasons).toContain('Shifts significant costs to seller');
      // Static hints (as regex source strings)
      expect(result.reasons.some(r => r.includes('automatic') || r.includes('extend'))).toBe(true);
      expect(result.reasons.some(r => r.includes('time is of the essence'))).toBe(true);
      expect(result.hints.length).toBeGreaterThan(0);
    });
  });
});