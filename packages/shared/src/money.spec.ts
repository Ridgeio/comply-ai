import { describe, it, expect } from 'vitest';
import { parseCurrencyToCents } from './money';

describe('parseCurrencyToCents', () => {
  it('should parse currency strings with commas and decimals', () => {
    expect(parseCurrencyToCents('1,234.56')).toBe(123456);
    expect(parseCurrencyToCents('2,000,000.00')).toBe(200000000);
    expect(parseCurrencyToCents('999.99')).toBe(99999);
  });

  it('should parse currency with dollar signs', () => {
    expect(parseCurrencyToCents('$1,234.56')).toBe(123456);
    expect(parseCurrencyToCents('$2,000')).toBe(200000);
    expect(parseCurrencyToCents('$ 100.50')).toBe(10050);
  });

  it('should handle whole numbers without decimals', () => {
    expect(parseCurrencyToCents('1234')).toBe(123400);
    expect(parseCurrencyToCents('$2000')).toBe(200000);
    expect(parseCurrencyToCents('0')).toBe(0);
  });

  it('should handle zero and empty amounts', () => {
    expect(parseCurrencyToCents('0')).toBe(0);
    expect(parseCurrencyToCents('0.00')).toBe(0);
    expect(parseCurrencyToCents('$0.00')).toBe(0);
  });

  it('should handle single decimal places', () => {
    expect(parseCurrencyToCents('10.5')).toBe(1050);
    expect(parseCurrencyToCents('$99.9')).toBe(9990);
  });

  it('should throw on negative amounts', () => {
    expect(() => parseCurrencyToCents('-1.00')).toThrow('Negative amounts are not allowed');
    expect(() => parseCurrencyToCents('-$100')).toThrow('Negative amounts are not allowed');
    expect(() => parseCurrencyToCents('($100.00)')).toThrow('Negative amounts are not allowed');
  });

  it('should throw on invalid formats', () => {
    expect(() => parseCurrencyToCents('abc')).toThrow('Invalid currency format');
    expect(() => parseCurrencyToCents('12,34.56')).toThrow('Invalid currency format');
    expect(() => parseCurrencyToCents('1.2.3')).toThrow('Invalid currency format');
    expect(() => parseCurrencyToCents('')).toThrow('Invalid currency format');
    expect(() => parseCurrencyToCents('$')).toThrow('Invalid currency format');
  });

  it('should handle edge cases', () => {
    expect(parseCurrencyToCents('000.00')).toBe(0);
    expect(parseCurrencyToCents('1000000')).toBe(100000000);
    expect(parseCurrencyToCents('.50')).toBe(50);
    expect(parseCurrencyToCents('$.99')).toBe(99);
  });
});