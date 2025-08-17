import type { Trec20 } from '../schemas/trec';

/**
 * Create a valid TREC-20 object with test defaults
 */
export function makeTrec20(overrides: Partial<Trec20> = {}): Trec20 {
  return {
    formVersion: '20-18',
    buyerNames: ['John Buyer', 'Jane Buyer'],
    sellerNames: ['Bob Seller', 'Alice Seller'],
    propertyAddress: {
      street: '123 Main St',
      city: 'Houston',
      state: 'TX',
      zip: '77001'
    },
    salesPrice: {
      cashPortion: 50000,
      financedPortion: 200000,
      total: 250000
    },
    earnestMoney: 5000,
    optionFee: 200,
    optionPeriodDays: 7,
    closingDate: '2025-03-15',
    effectiveDate: '2025-01-15',
    titleCompany: 'Texas Title Co',
    surveyType: 'existing',
    hasHoa: false,
    hoaFees: null,
    specialProvisions: '',
    ...overrides
  };
}