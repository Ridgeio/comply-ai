import type { Trec20 } from '../schemas/trec';

export function makeTrec20(overrides: Partial<Trec20> = {}): Trec20 {
  return {
    buyerNames: ['Jane Buyer'],
    sellerNames: ['John Seller'],
    propertyAddress: { 
      street: '123 Main', 
      city: 'Houston', 
      state: 'TX', 
      zip: '77002' 
    },
    salesPrice: { 
      totalCents: 30000000, 
      cashPortionCents: 500000, 
      financedPortionCents: 29500000 
    },
    effectiveDate: '2025-01-03',
    closingDate: '2025-02-03', // Monday
    optionFeeCents: 20000,
    optionPeriodDays: 7,
    financingType: 'conventional',
    specialProvisionsText: 'Standard provisions',
    formVersion: '20-18',
    ...overrides,
  };
}