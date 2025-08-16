import type { Issue, Rule } from './types';

export function runRules<T>(input: T, rules: Rule<T>[]): Issue[] {
  const issues: Issue[] = [];
  
  for (const rule of rules) {
    let isProblem = false;
    
    try {
      isProblem = rule.predicate(input);
    } catch (error) {
      // Rule threw an error - record it and continue
      issues.push({
        id: `${rule.id}.error`,
        message: `Rule threw: ${(error as Error).message}`,
        severity: 'low',
      });
      continue;
    }
    
    if (isProblem) {
      // Build base issue
      const baseIssue: Issue = {
        id: rule.id,
        message: rule.description,
        severity: rule.severity,
        cite: rule.cite,
      };
      
      // Apply custom build if provided
      const customizations = rule.build?.(input) ?? {};
      
      // Merge, with customizations overriding base (except cite which is preserved unless explicitly overridden)
      issues.push({ ...baseIssue, ...customizations });
    }
  }
  
  return issues;
}