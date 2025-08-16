export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type Issue = {
  id: string;              // e.g. "trec20.version.outdated"
  message: string;         // human-readable
  severity: Severity;
  cite?: string;           // paragraph reference, e.g. "TREC 20-18 ¶5"
  data?: Record<string, unknown>;
};

export type Rule<T> = {
  id: string;
  description: string;
  severity: Severity;
  cite?: string;
  predicate: (input: T) => boolean;  // returns true when a problem exists
  build?: (input: T) => Partial<Issue>; // allows dynamic message/data
};