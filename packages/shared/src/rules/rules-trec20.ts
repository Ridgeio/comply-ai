import type { Rule } from './types';
import type { Trec20 } from '../schemas/trec';
import { FormsRegistry, isOutdated, getExpectedVersion } from './formsRegistry';

// Helper functions for date calculations
function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function isWeekend(isoDate: string): boolean {
  // Parse ISO date string (YYYY-MM-DD) and create date at noon to avoid timezone issues
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
}

// Define all 25 rules as a function that takes a registry
export function trec20Rules(registry: FormsRegistry): Rule<Trec20>[] {
  const expectedVersion = getExpectedVersion('TREC-20', registry) || '20-18'; // Fallback for compatibility
  
  return [
    // 1. Version present
    {
      id: 'trec20.version.missing',
      description: 'Form version is missing',
      severity: 'high',
      cite: 'Form footer',
      predicate: (trec) => !trec.formVersion || trec.formVersion.trim() === '',
      debug: (trec) => ({
        formVersion: trec.formVersion,
        isEmpty: !trec.formVersion || trec.formVersion.trim() === ''
      }),
    },

    // 2. Version outdated
    {
      id: 'trec20.version.outdated',
      description: 'Outdated form version',
      severity: 'high',
      cite: 'Form footer',
      predicate: (trec) => isOutdated(trec.formVersion, 'TREC-20', registry),
      build: (trec) => ({
        message: `Outdated form version: ${trec.formVersion}. Expected ${expectedVersion}`,
        data: { currentVersion: trec.formVersion, expectedVersion },
      }),
      debug: (trec) => ({
        formVersion: trec.formVersion,
        expectedVersion,
        isOutdated: isOutdated(trec.formVersion, 'TREC-20', registry)
      }),
  },

  // 3. Buyer required
  {
    id: 'trec20.buyer.missing',
    description: 'At least one buyer name is required',
    severity: 'critical',
    cite: 'TREC 20-18 ¶1 Parties',
    predicate: (trec) => !trec.buyerNames || trec.buyerNames.length === 0,
    debug: (trec) => ({
      buyerNames: trec.buyerNames,
      buyerCount: trec.buyerNames?.length || 0,
      expectedMinimum: 1
    }),
  },

  // 4. Seller required
  {
    id: 'trec20.seller.missing',
    description: 'At least one seller name is required',
    severity: 'critical',
    cite: 'TREC 20-18 ¶1 Parties',
    predicate: (trec) => !trec.sellerNames || trec.sellerNames.length === 0,
    debug: (trec) => ({
      sellerNames: trec.sellerNames,
      sellerCount: trec.sellerNames?.length || 0,
      expectedMinimum: 1
    }),
  },

  // 5. Address street required
  {
    id: 'trec20.address.street.missing',
    description: 'Property street address is required',
    severity: 'critical',
    cite: 'TREC 20-18 ¶2 Property',
    predicate: (trec) => !trec.propertyAddress.street || trec.propertyAddress.street.trim() === '',
    debug: (trec) => ({
      street: trec.propertyAddress.street,
      isEmpty: !trec.propertyAddress.street || trec.propertyAddress.street.trim() === ''
    }),
  },

  // 6. Address city required
  {
    id: 'trec20.address.city.missing',
    description: 'Property city is required',
    severity: 'critical',
    cite: 'TREC 20-18 ¶2 Property',
    predicate: (trec) => !trec.propertyAddress.city || trec.propertyAddress.city.trim() === '',
  },

  // 7. Address state 2-letter
  {
    id: 'trec20.address.state.invalid',
    description: 'Property state must be 2 letters',
    severity: 'high',
    cite: 'TREC 20-18 ¶2 Property',
    predicate: (trec) => trec.propertyAddress.state.length !== 2,
  },

  // 8. ZIP min length
  {
    id: 'trec20.address.zip.invalid',
    description: 'Property ZIP code must be at least 5 digits',
    severity: 'medium',
    cite: 'TREC 20-18 ¶2 Property',
    predicate: (trec) => trec.propertyAddress.zip.length < 5,
  },

  // 9. Total price > 0
  {
    id: 'trec20.price.zero',
    description: 'Sales price must be greater than zero',
    severity: 'critical',
    cite: 'TREC 20-18 ¶3 Sales Price',
    predicate: (trec) => trec.salesPrice.totalCents <= 0,
  },

  // 10. Cash+Financed = Total (within $1 tolerance)
  {
    id: 'trec20.price.sum.mismatch',
    description: 'Cash plus financed amounts do not equal total price',
    severity: 'high',
    cite: 'TREC 20-18 ¶3 Sales Price',
    predicate: (trec) => {
      const { cashPortionCents, financedPortionCents, totalCents } = trec.salesPrice;
      if (cashPortionCents === undefined || financedPortionCents === undefined) {
        return false; // Skip if not both present
      }
      const sum = cashPortionCents + financedPortionCents;
      const difference = Math.abs(sum - totalCents);
      return difference > 100; // More than $1.00 difference
    },
    build: (trec) => {
      const { cashPortionCents = 0, financedPortionCents = 0, totalCents } = trec.salesPrice;
      const sum = cashPortionCents + financedPortionCents;
      const difference = Math.abs(sum - totalCents);
      return {
        message: `Cash ($${(cashPortionCents / 100).toFixed(2)}) + Financed ($${(financedPortionCents / 100).toFixed(2)}) = $${(sum / 100).toFixed(2)}, but total is $${(totalCents / 100).toFixed(2)} (difference: $${(difference / 100).toFixed(2)})`,
        data: { cashPortionCents, financedPortionCents, totalCents, sum, difference },
      };
    },
    debug: (trec) => {
      const { cashPortionCents = 0, financedPortionCents = 0, totalCents } = trec.salesPrice;
      const sum = cashPortionCents + financedPortionCents;
      const difference = Math.abs(sum - totalCents);
      return {
        cashPortionCents,
        financedPortionCents,
        totalCents,
        calculatedSum: sum,
        difference,
        toleranceCents: 100
      };
    },
  },

  // 11. Cash financing requires no financed portion
  {
    id: 'trec20.cash.has.financing',
    description: 'Cash transactions should not have financed portion',
    severity: 'high',
    cite: 'TREC 20-18 ¶7 Financing',
    predicate: (trec) => {
      return trec.financingType === 'cash' && 
             trec.salesPrice.financedPortionCents !== undefined &&
             trec.salesPrice.financedPortionCents > 0;
    },
  },

  // 12. Non-cash requires financed portion
  {
    id: 'trec20.financing.missing',
    description: 'Financed transactions must have financed portion',
    severity: 'high',
    cite: 'TREC 20-18 ¶7 Financing',
    predicate: (trec) => {
      return trec.financingType !== undefined &&
             trec.financingType !== 'cash' && 
             (!trec.salesPrice.financedPortionCents || trec.salesPrice.financedPortionCents <= 0);
    },
    build: (trec) => ({
      message: `${trec.financingType} financing requires a financed portion greater than zero`,
      data: { financingType: trec.financingType },
    }),
  },

  // 13. Effective date <= Closing date
  {
    id: 'trec20.dates.order',
    description: 'Effective date must not be after closing date',
    severity: 'high',
    cite: 'TREC 20-18 ¶9 Closing',
    predicate: (trec) => {
      if (!trec.effectiveDate || !trec.closingDate) return false;
      return trec.effectiveDate > trec.closingDate;
    },
    build: (trec) => ({
      message: `Effective date (${trec.effectiveDate}) is after closing date (${trec.closingDate})`,
      data: { effectiveDate: trec.effectiveDate, closingDate: trec.closingDate },
    }),
  },

  // 14. Option fee present => option period required
  {
    id: 'trec20.option.period.missing',
    description: 'Option period days required when option fee is present',
    severity: 'high',
    cite: 'TREC 20-18 ¶23 Option',
    predicate: (trec) => {
      return trec.optionFeeCents !== undefined && 
             trec.optionFeeCents > 0 &&
             (!trec.optionPeriodDays || trec.optionPeriodDays <= 0);
    },
  },

  // 15. Option period > 0 when fee present
  {
    id: 'trec20.option.period.zero',
    description: 'Option period must be greater than zero when fee is paid',
    severity: 'medium',
    cite: 'TREC 20-18 ¶23 Option',
    predicate: (trec) => {
      return trec.optionFeeCents !== undefined && 
             trec.optionFeeCents > 0 &&
             trec.optionPeriodDays !== undefined &&
             trec.optionPeriodDays <= 0;
    },
  },

  // 16. Option end date before closing
  {
    id: 'trec20.option.end.late',
    description: 'Option period ends after closing date',
    severity: 'medium',
    cite: 'TREC 20-18 ¶23 Option',
    predicate: (trec) => {
      if (!trec.effectiveDate || !trec.closingDate || !trec.optionPeriodDays) {
        return false;
      }
      const optionEndDate = addDaysToIsoDate(trec.effectiveDate, trec.optionPeriodDays);
      return optionEndDate >= trec.closingDate;
    },
    build: (trec) => {
      const optionEndDate = addDaysToIsoDate(trec.effectiveDate!, trec.optionPeriodDays!);
      return {
        message: `Option period ends on ${optionEndDate}, which is on or after closing date ${trec.closingDate}`,
        data: { optionEndDate, closingDate: trec.closingDate },
      };
    },
  },

  // 17. Closing date not on weekend
  {
    id: 'trec20.closing.weekend',
    description: 'Closing date falls on a weekend',
    severity: 'low',
    cite: 'Business day considerations',
    predicate: (trec) => {
      if (!trec.closingDate) return false;
      return isWeekend(trec.closingDate);
    },
    build: (trec) => {
      const date = new Date(trec.closingDate!);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      return {
        message: `Closing date ${trec.closingDate} falls on a ${dayName}. Consider selecting a business day.`,
        data: { closingDate: trec.closingDate, dayOfWeek: dayName },
      };
    },
  },

  // 18. Special provisions length
  {
    id: 'trec20.provisions.long',
    description: 'Special provisions text is unusually long',
    severity: 'low',
    cite: 'TREC 20-18 ¶11 Special Provisions',
    predicate: (trec) => {
      return trec.specialProvisionsText !== undefined &&
             trec.specialProvisionsText.length > 500;
    },
    build: (trec) => ({
      message: `Special provisions text is ${trec.specialProvisionsText!.length} characters (recommended: under 500)`,
      data: { length: trec.specialProvisionsText!.length, recommended: 500 },
    }),
  },

  // 19. Buyer & Seller names not identical
  {
    id: 'trec20.parties.same',
    description: 'Buyer and seller names appear to be the same',
    severity: 'medium',
    cite: 'TREC 20-18 ¶1 Parties',
    predicate: (trec) => {
      const buyerSet = new Set(trec.buyerNames.map(n => n.toLowerCase().trim()));
      const sellerSet = new Set(trec.sellerNames.map(n => n.toLowerCase().trim()));
      for (const buyer of buyerSet) {
        if (sellerSet.has(buyer)) return true;
      }
      return false;
    },
    build: (trec) => {
      const buyerSet = new Set(trec.buyerNames.map(n => n.toLowerCase().trim()));
      const sellerSet = new Set(trec.sellerNames.map(n => n.toLowerCase().trim()));
      const matches: string[] = [];
      for (const buyer of buyerSet) {
        if (sellerSet.has(buyer)) {
          matches.push(buyer);
        }
      }
      return {
        message: `Same party appears as both buyer and seller: ${matches.join(', ')}`,
        data: { matchingNames: matches },
      };
    },
  },

  // 20. Total equals sum (stricter version when both parts present)
  {
    id: 'trec20.price.parts.required',
    description: 'Both cash and financed portions should be specified',
    severity: 'medium',
    cite: 'TREC 20-18 ¶3 Sales Price',
    predicate: (trec) => {
      const { cashPortionCents, financedPortionCents } = trec.salesPrice;
      // Issue if one is present but not the other (except for all-cash)
      if (trec.financingType === 'cash') return false;
      return (cashPortionCents === undefined && financedPortionCents !== undefined) ||
             (cashPortionCents !== undefined && financedPortionCents === undefined);
    },
  },

  // 21. Currency sanity - negative values
  {
    id: 'trec20.price.negative',
    description: 'Price amounts cannot be negative',
    severity: 'critical',
    cite: 'TREC 20-18 ¶3 Sales Price',
    predicate: (trec) => {
      return trec.salesPrice.totalCents < 0 ||
             (trec.salesPrice.cashPortionCents !== undefined && trec.salesPrice.cashPortionCents < 0) ||
             (trec.salesPrice.financedPortionCents !== undefined && trec.salesPrice.financedPortionCents < 0) ||
             (trec.optionFeeCents !== undefined && trec.optionFeeCents < 0);
    },
  },

  // 22. Missing closing date
  {
    id: 'trec20.closing.missing',
    description: 'Closing date is required',
    severity: 'high',
    cite: 'TREC 20-18 ¶9 Closing',
    predicate: (trec) => !trec.closingDate,
  },

  // 23. Missing effective date
  {
    id: 'trec20.effective.missing',
    description: 'Effective date is required',
    severity: 'medium',
    cite: 'TREC 20-18 Contract Date',
    predicate: (trec) => !trec.effectiveDate,
  },

  // 24. Whitespace-only names (handled by schema validation, but explicit check)
  {
    id: 'trec20.names.whitespace',
    description: 'Names contain only whitespace',
    severity: 'critical',
    cite: 'TREC 20-18 ¶1 Parties',
    predicate: (trec) => {
      const hasWhitespaceOnly = (names: string[]) => 
        names.some(name => name.trim() === '');
      return hasWhitespaceOnly(trec.buyerNames) || hasWhitespaceOnly(trec.sellerNames);
    },
  },

  // 25. Address state uppercase (auto-fix suggestion)
  {
    id: 'trec20.address.state.case',
    description: 'State abbreviation should be uppercase',
    severity: 'info',
    cite: 'TREC 20-18 ¶2 Property',
    predicate: (trec) => {
      const state = trec.propertyAddress.state;
      return state !== state.toUpperCase();
    },
    build: (trec) => ({
      message: `State abbreviation "${trec.propertyAddress.state}" should be uppercase "${trec.propertyAddress.state.toUpperCase()}"`,
      data: { 
        current: trec.propertyAddress.state, 
        suggested: trec.propertyAddress.state.toUpperCase() 
      },
    }),
  },
  ];
}

// Export a default rules array for backward compatibility (uses empty registry)
export const trec20RulesDefault = trec20Rules({});