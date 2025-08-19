import { describe, it, expect } from 'vitest';
import { runRules } from '../engine';
import { trec20Rules } from '../rules-trec20';
import { makeTrec20 } from '../../test/factories';
import type { FormsRegistry } from '../formsRegistry';

describe('TREC-20 Rules', () => {
  // Default registry for testing
  const defaultRegistry: FormsRegistry = {
    'TREC-20': {
      expected_version: '20-18',
      effective_date: null
    }
  };

  describe('Rule #2: Version outdated', () => {
    it('should pass when version is 20-18', () => {
      const trec = makeTrec20({ formVersion: '20-18' });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const versionIssues = issues.filter(i => i.id === 'trec20.version.outdated');
      expect(versionIssues).toHaveLength(0);
    });

    it('should fail when version is not 20-18', () => {
      const trec = makeTrec20({ formVersion: '20-17' });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const versionIssue = issues.find(i => i.id === 'trec20.version.outdated');
      expect(versionIssue).toBeDefined();
      expect(versionIssue?.severity).toBe('high');
    });
  });

  describe('Rule #10: Cash+Financed = Total', () => {
    it('should pass when cash + financed equals total', () => {
      const trec = makeTrec20({
        salesPrice: {
          cashPortionCents: 500000,
          financedPortionCents: 29500000,
          totalCents: 30000000,
        },
      });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const sumIssues = issues.filter(i => i.id === 'trec20.price.sum.mismatch');
      expect(sumIssues).toHaveLength(0);
    });

    it('should pass within $1 tolerance', () => {
      const trec = makeTrec20({
        salesPrice: {
          cashPortionCents: 500000,
          financedPortionCents: 29500099, // Off by 99 cents
          totalCents: 30000000,
        },
      });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const sumIssues = issues.filter(i => i.id === 'trec20.price.sum.mismatch');
      expect(sumIssues).toHaveLength(0);
    });

    it('should fail when difference exceeds $1', () => {
      const trec = makeTrec20({
        salesPrice: {
          cashPortionCents: 500000,
          financedPortionCents: 29498900, // Off by $11
          totalCents: 30000000,
        },
      });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const sumIssue = issues.find(i => i.id === 'trec20.price.sum.mismatch');
      expect(sumIssue).toBeDefined();
      expect(sumIssue?.severity).toBe('high');
    });
  });

  describe('Rule #12: Non-cash requires financing', () => {
    it('should pass when conventional has financed portion', () => {
      const trec = makeTrec20({
        financingType: 'conventional',
        salesPrice: {
          cashPortionCents: 500000,
          financedPortionCents: 29500000,
          totalCents: 30000000,
        },
      });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const financeIssues = issues.filter(i => i.id === 'trec20.financing.missing');
      expect(financeIssues).toHaveLength(0);
    });

    it('should fail when non-cash has no financed portion', () => {
      const trec = makeTrec20({
        financingType: 'fha',
        salesPrice: {
          cashPortionCents: 30000000,
          financedPortionCents: undefined,
          totalCents: 30000000,
        },
      });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const financeIssue = issues.find(i => i.id === 'trec20.financing.missing');
      expect(financeIssue).toBeDefined();
      expect(financeIssue?.severity).toBe('high');
    });
  });

  describe('Rule #13: Effective date <= Closing date', () => {
    it('should pass when effective before closing', () => {
      const trec = makeTrec20({
        effectiveDate: '2025-01-03',
        closingDate: '2025-02-01',
      });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const dateIssues = issues.filter(i => i.id === 'trec20.dates.order');
      expect(dateIssues).toHaveLength(0);
    });

    it('should pass when dates are equal', () => {
      const trec = makeTrec20({
        effectiveDate: '2025-02-01',
        closingDate: '2025-02-01',
      });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const dateIssues = issues.filter(i => i.id === 'trec20.dates.order');
      expect(dateIssues).toHaveLength(0);
    });

    it('should fail when effective after closing', () => {
      const trec = makeTrec20({
        effectiveDate: '2025-02-15',
        closingDate: '2025-02-01',
      });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const dateIssue = issues.find(i => i.id === 'trec20.dates.order');
      expect(dateIssue).toBeDefined();
      expect(dateIssue?.severity).toBe('high');
    });
  });

  describe('Rule #16: Option end before closing', () => {
    it('should pass when option ends before closing', () => {
      const trec = makeTrec20({
        effectiveDate: '2025-01-03',
        closingDate: '2025-02-01',
        optionFeeCents: 20000,
        optionPeriodDays: 7, // Ends 2025-01-10
      });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const optionIssues = issues.filter(i => i.id === 'trec20.option.end.late');
      expect(optionIssues).toHaveLength(0);
    });

    it('should fail when option ends after closing', () => {
      const trec = makeTrec20({
        effectiveDate: '2025-01-03',
        closingDate: '2025-01-08',
        optionFeeCents: 20000,
        optionPeriodDays: 10, // Ends 2025-01-13
      });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const optionIssue = issues.find(i => i.id === 'trec20.option.end.late');
      expect(optionIssue).toBeDefined();
      expect(optionIssue?.severity).toBe('medium');
    });
  });

  describe('Rule #17: Weekend closing warning', () => {
    it('should pass when closing on weekday', () => {
      const trec = makeTrec20({
        closingDate: '2025-02-04', // Tuesday Feb 4, 2025
      });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const weekendIssues = issues.filter(i => i.id === 'trec20.closing.weekend');
      expect(weekendIssues).toHaveLength(0);
    });

    it('should warn when closing on Saturday', () => {
      const trec = makeTrec20({
        closingDate: '2025-02-08', // Saturday Feb 8, 2025
      });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const weekendIssue = issues.find(i => i.id === 'trec20.closing.weekend');
      expect(weekendIssue).toBeDefined();
      expect(weekendIssue?.severity).toBe('low');
    });

    it('should warn when closing on Sunday', () => {
      const trec = makeTrec20({
        closingDate: '2025-02-09', // Sunday Feb 9, 2025
      });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const weekendIssue = issues.find(i => i.id === 'trec20.closing.weekend');
      expect(weekendIssue).toBeDefined();
      expect(weekendIssue?.severity).toBe('low');
    });
  });

  describe('Rule #21: Currency sanity (no negatives)', () => {
    it('should pass with all positive amounts', () => {
      const trec = makeTrec20({
        salesPrice: {
          cashPortionCents: 500000,
          financedPortionCents: 29500000,
          totalCents: 30000000,
        },
        optionFeeCents: 20000,
      });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const negativeIssues = issues.filter(i => i.id.includes('negative'));
      expect(negativeIssues).toHaveLength(0);
    });

    it('should fail with negative total', () => {
      const trec = makeTrec20({
        salesPrice: {
          cashPortionCents: 500000,
          financedPortionCents: 29500000,
          totalCents: -30000000,
        },
      });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const negativeIssue = issues.find(i => i.id === 'trec20.price.negative');
      expect(negativeIssue).toBeDefined();
      expect(negativeIssue?.severity).toBe('critical');
    });
  });

  describe('Required fields', () => {
    it('should fail when buyers missing', () => {
      const trec = makeTrec20({ buyerNames: [] });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const buyerIssue = issues.find(i => i.id === 'trec20.buyer.missing');
      expect(buyerIssue).toBeDefined();
      expect(buyerIssue?.severity).toBe('critical');
    });

    it('should fail when sellers missing', () => {
      const trec = makeTrec20({ sellerNames: [] });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const sellerIssue = issues.find(i => i.id === 'trec20.seller.missing');
      expect(sellerIssue).toBeDefined();
      expect(sellerIssue?.severity).toBe('critical');
    });

    it('should fail when address incomplete', () => {
      const trec = makeTrec20({
        propertyAddress: {
          street: '',
          city: 'Houston',
          state: 'TX',
          zip: '77002',
        },
      });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const streetIssue = issues.find(i => i.id === 'trec20.address.street.missing');
      expect(streetIssue).toBeDefined();
      expect(streetIssue?.severity).toBe('critical');
    });
  });

  describe('Cash transactions', () => {
    it('should pass cash transaction with no financing', () => {
      const trec = makeTrec20({
        financingType: 'cash',
        salesPrice: {
          cashPortionCents: 30000000,
          financedPortionCents: 0,
          totalCents: 30000000,
        },
      });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const cashIssues = issues.filter(i => i.id === 'trec20.cash.has.financing');
      expect(cashIssues).toHaveLength(0);
    });

    it('should fail cash transaction with financing', () => {
      const trec = makeTrec20({
        financingType: 'cash',
        salesPrice: {
          cashPortionCents: 500000,
          financedPortionCents: 29500000,
          totalCents: 30000000,
        },
      });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      const cashIssue = issues.find(i => i.id === 'trec20.cash.has.financing');
      expect(cashIssue).toBeDefined();
      expect(cashIssue?.severity).toBe('high');
    });
  });

  describe('Complete validation', () => {
    it('should validate a perfect document with no issues', () => {
      const trec = makeTrec20(); // Factory default is valid
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      expect(issues).toHaveLength(0);
    });

    it('should catch multiple issues in problematic document', () => {
      const trec = makeTrec20({
        buyerNames: [],
        formVersion: '20-17',
        salesPrice: {
          cashPortionCents: 1000000,
          financedPortionCents: 2000000,
          totalCents: 30000000, // Way off
        },
        effectiveDate: '2025-02-15',
        closingDate: '2025-02-01', // Before effective
      });
      const issues = runRules(trec, trec20Rules(defaultRegistry));
      
      expect(issues.length).toBeGreaterThan(3);
      expect(issues.some(i => i.id === 'trec20.buyer.missing')).toBe(true);
      expect(issues.some(i => i.id === 'trec20.version.outdated')).toBe(true);
      expect(issues.some(i => i.id === 'trec20.price.sum.mismatch')).toBe(true);
      expect(issues.some(i => i.id === 'trec20.dates.order')).toBe(true);
    });
  });
});