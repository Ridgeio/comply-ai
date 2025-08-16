import { describe, it, expect } from 'vitest';
import { runRules } from '../engine';
import type { Rule } from '../types';

describe('Rule Engine', () => {
  it('should return an issue when a rule predicate returns true', () => {
    const alwaysFailRule: Rule<any> = {
      id: 'test.always.fail',
      description: 'This rule always fails',
      severity: 'high',
      cite: 'Test ¶1',
      predicate: () => true,
    };

    const issues = runRules({}, [alwaysFailRule]);
    
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual({
      id: 'test.always.fail',
      message: 'This rule always fails',
      severity: 'high',
      cite: 'Test ¶1',
    });
  });

  it('should return no issues when rule predicate returns false', () => {
    const alwaysPassRule: Rule<any> = {
      id: 'test.always.pass',
      description: 'This rule always passes',
      severity: 'low',
      predicate: () => false,
    };

    const issues = runRules({}, [alwaysPassRule]);
    
    expect(issues).toHaveLength(0);
  });

  it('should handle multiple rules', () => {
    const rules: Rule<{ value: number }>[] = [
      {
        id: 'test.gt.10',
        description: 'Value must not be greater than 10',
        severity: 'medium',
        predicate: (input) => input.value > 10,
      },
      {
        id: 'test.lt.5',
        description: 'Value must not be less than 5',
        severity: 'medium',
        predicate: (input) => input.value < 5,
      },
    ];

    const issues1 = runRules({ value: 3 }, rules);
    expect(issues1).toHaveLength(1);
    expect(issues1[0].id).toBe('test.lt.5');

    const issues2 = runRules({ value: 7 }, rules);
    expect(issues2).toHaveLength(0);

    const issues3 = runRules({ value: 15 }, rules);
    expect(issues3).toHaveLength(1);
    expect(issues3[0].id).toBe('test.gt.10');
  });

  it('should handle rule exceptions gracefully', () => {
    const throwingRule: Rule<any> = {
      id: 'test.throws',
      description: 'This rule throws an error',
      severity: 'critical',
      predicate: () => {
        throw new Error('Predicate error');
      },
    };

    const validRule: Rule<any> = {
      id: 'test.valid',
      description: 'This rule is valid',
      severity: 'low',
      predicate: () => true,
    };

    const issues = runRules({}, [throwingRule, validRule]);
    
    expect(issues).toHaveLength(2);
    expect(issues[0]).toEqual({
      id: 'test.throws.error',
      message: 'Rule threw: Predicate error',
      severity: 'low',
    });
    expect(issues[1].id).toBe('test.valid');
  });

  it('should use build function to customize issue', () => {
    const customRule: Rule<{ name: string; age: number }> = {
      id: 'test.custom',
      description: 'Base description',
      severity: 'medium',
      predicate: (input) => input.age < 18,
      build: (input) => ({
        message: `${input.name} is under 18 (age: ${input.age})`,
        data: { actualAge: input.age, requiredAge: 18 },
      }),
    };

    const issues = runRules({ name: 'John', age: 16 }, [customRule]);
    
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual({
      id: 'test.custom',
      message: 'John is under 18 (age: 16)',
      severity: 'medium',
      data: { actualAge: 16, requiredAge: 18 },
    });
  });

  it('should preserve cite in build override', () => {
    const rule: Rule<any> = {
      id: 'test.cite',
      description: 'Base message',
      severity: 'high',
      cite: 'Section 5.2',
      predicate: () => true,
      build: () => ({
        message: 'Custom message',
      }),
    };

    const issues = runRules({}, [rule]);
    
    expect(issues[0].cite).toBe('Section 5.2');
    expect(issues[0].message).toBe('Custom message');
  });
});