import { describe, it, expect } from 'vitest';
import { trec20Rules } from '../rules-trec20';
import { makeTrec20 } from '../test-factories';
import type { FormsRegistry } from '../formsRegistry';

describe('TREC-20 Version Registry', () => {
  const registry: FormsRegistry = {
    'TREC-20': { 
      expected_version: '20-18',
      effective_date: '2025-01-03'
    },
    'TREC-40-11': {
      expected_version: '40-11',
      effective_date: null
    }
  };

  describe('version outdated rule with registry', () => {
    it('should trigger outdated when version does not match registry', () => {
      const trec = makeTrec20({ formVersion: '20-17' });
      const rules = trec20Rules(registry);
      const outdatedRule = rules.find(r => r.id === 'trec20.version.outdated');
      
      expect(outdatedRule).toBeDefined();
      expect(outdatedRule?.predicate(trec)).toBe(true);
      
      const issue = outdatedRule?.build(trec);
      expect(issue?.message).toContain('20-17');
      expect(issue?.message).toContain('20-18');
    });

    it('should not trigger outdated when version matches registry', () => {
      const trec = makeTrec20({ formVersion: '20-18' });
      const rules = trec20Rules(registry);
      const outdatedRule = rules.find(r => r.id === 'trec20.version.outdated');
      
      expect(outdatedRule?.predicate(trec)).toBe(false);
    });

    it('should not trigger outdated when form code not in registry', () => {
      const emptyRegistry: FormsRegistry = {};
      const trec = makeTrec20({ formVersion: '20-17' });
      const rules = trec20Rules(emptyRegistry);
      const outdatedRule = rules.find(r => r.id === 'trec20.version.outdated');
      
      expect(outdatedRule?.predicate(trec)).toBe(false);
    });

    it('should handle undefined version', () => {
      const trec = makeTrec20({ formVersion: undefined });
      const rules = trec20Rules(registry);
      const outdatedRule = rules.find(r => r.id === 'trec20.version.outdated');
      
      expect(outdatedRule?.predicate(trec)).toBe(false);
    });
  });

  describe('registry integration', () => {
    it('should use registry for all version checks', () => {
      const rules = trec20Rules(registry);
      
      // Ensure all rules are created
      expect(rules.length).toBeGreaterThan(0);
      
      // Check that version rules exist
      const versionRules = rules.filter(r => r.id.includes('version'));
      expect(versionRules.length).toBeGreaterThanOrEqual(2); // missing and outdated
    });

    it('should include expected version in issue details', () => {
      const trec = makeTrec20({ formVersion: '20-15' });
      const rules = trec20Rules(registry);
      const outdatedRule = rules.find(r => r.id === 'trec20.version.outdated');
      
      const issue = outdatedRule?.build(trec);
      expect(issue?.message).toMatch(/Expected 20-18/);
    });

    it('should work with different registry versions', () => {
      const customRegistry: FormsRegistry = {
        'TREC-20': { 
          expected_version: '20-19',
          effective_date: '2025-06-01'
        }
      };
      
      const trec = makeTrec20({ formVersion: '20-18' });
      const rules = trec20Rules(customRegistry);
      const outdatedRule = rules.find(r => r.id === 'trec20.version.outdated');
      
      // 20-18 is now outdated compared to 20-19
      expect(outdatedRule?.predicate(trec)).toBe(true);
      
      const issue = outdatedRule?.build(trec);
      expect(issue?.message).toContain('20-19');
    });
  });
});