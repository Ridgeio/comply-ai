import { describe, it, expect } from 'vitest';
import { fromRawTrec20 } from './trec20';
import type { RawTrec20 } from '@repo/parsers';

describe('fromRawTrec20', () => {
  it('should convert raw TREC20 data to typed model', () => {
    const raw: RawTrec20 & { formVersion?: string } = {
      buyer_names: ['Jane Q Buyer', ''],
      seller_names: ['John Seller'],
      property_address: {
        street: '123 Main St',
        city: 'Houston',
        state: 'tx',
        zip: '77002'
      },
      sales_price: {
        cash_portion: '5,000.00',
        financed_portion: '295,000.00',
        total: '300,000.00'
      },
      effective_date: '01/03/2025',
      closing_date: '02/01/2025',
      option_fee: '200.00',
      option_period_days: '7',
      financing_type: 'conventional',
      special_provisions_text: 'Seller to leave fridge.',
      formVersion: '20-18'
    };

    const result = fromRawTrec20(raw);

    expect(result.buyerNames).toEqual(['Jane Q Buyer']);
    expect(result.sellerNames).toEqual(['John Seller']);
    expect(result.propertyAddress).toEqual({
      street: '123 Main St',
      city: 'Houston',
      state: 'TX',
      zip: '77002'
    });
    expect(result.salesPrice).toEqual({
      cashPortionCents: 500000,
      financedPortionCents: 29500000,
      totalCents: 30000000
    });
    expect(result.effectiveDate).toBe('2025-01-03');
    expect(result.closingDate).toBe('2025-02-01');
    expect(result.optionFeeCents).toBe(20000);
    expect(result.optionPeriodDays).toBe(7);
    expect(result.financingType).toBe('conventional');
    expect(result.specialProvisionsText).toBe('Seller to leave fridge.');
    expect(result.formVersion).toBe('20-18');
  });

  it('should handle minimal required fields only', () => {
    const raw: RawTrec20 = {
      buyer_names: ['Buyer One'],
      seller_names: ['Seller One'],
      property_address: {
        street: '456 Oak Ave',
        city: 'Austin',
        state: 'TX',
        zip: '78701'
      },
      sales_price: {
        cash_portion: '',
        financed_portion: '',
        total: '250000'
      }
    };

    const result = fromRawTrec20(raw);

    expect(result.buyerNames).toEqual(['Buyer One']);
    expect(result.sellerNames).toEqual(['Seller One']);
    expect(result.propertyAddress.state).toBe('TX');
    expect(result.salesPrice.totalCents).toBe(25000000);
    expect(result.salesPrice.cashPortionCents).toBeUndefined();
    expect(result.salesPrice.financedPortionCents).toBeUndefined();
    expect(result.effectiveDate).toBeUndefined();
    expect(result.optionFeeCents).toBeUndefined();
  });

  it('should filter out empty buyer and seller names', () => {
    const raw: RawTrec20 = {
      buyer_names: ['', 'John Buyer', '', 'Jane Buyer', ''],
      seller_names: ['', 'Sam Seller', ''],
      property_address: {
        street: '789 Pine St',
        city: 'Dallas',
        state: 'tx',
        zip: '75201'
      },
      sales_price: {
        cash_portion: '',
        financed_portion: '',
        total: '100000'
      }
    };

    const result = fromRawTrec20(raw);

    expect(result.buyerNames).toEqual(['John Buyer', 'Jane Buyer']);
    expect(result.sellerNames).toEqual(['Sam Seller']);
  });

  it('should normalize state to uppercase', () => {
    const raw: RawTrec20 = {
      buyer_names: ['Buyer'],
      seller_names: ['Seller'],
      property_address: {
        street: '123 St',
        city: 'City',
        state: 'ca',
        zip: '90210'
      },
      sales_price: {
        cash_portion: '',
        financed_portion: '',
        total: '0'
      }
    };

    const result = fromRawTrec20(raw);
    expect(result.propertyAddress.state).toBe('CA');
  });

  it('should convert various date formats to ISO', () => {
    const raw: RawTrec20 = {
      buyer_names: ['Buyer'],
      seller_names: ['Seller'],
      property_address: {
        street: '123 St',
        city: 'City',
        state: 'TX',
        zip: '12345'
      },
      sales_price: {
        cash_portion: '',
        financed_portion: '',
        total: '100'
      },
      effective_date: '12/25/2024',
      closing_date: '01/01/2025'
    };

    const result = fromRawTrec20(raw);
    expect(result.effectiveDate).toBe('2024-12-25');
    expect(result.closingDate).toBe('2025-01-01');
  });

  it('should throw on invalid currency format', () => {
    const raw: RawTrec20 = {
      buyer_names: ['Buyer'],
      seller_names: ['Seller'],
      property_address: {
        street: '123 St',
        city: 'City',
        state: 'TX',
        zip: '12345'
      },
      sales_price: {
        cash_portion: '',
        financed_portion: '',
        total: 'invalid'
      }
    };

    expect(() => fromRawTrec20(raw)).toThrow();
  });

  it('should throw on invalid date format', () => {
    const raw: RawTrec20 = {
      buyer_names: ['Buyer'],
      seller_names: ['Seller'],
      property_address: {
        street: '123 St',
        city: 'City',
        state: 'TX',
        zip: '12345'
      },
      sales_price: {
        cash_portion: '',
        financed_portion: '',
        total: '1000'
      },
      effective_date: 'not-a-date'
    };

    expect(() => fromRawTrec20(raw)).toThrow();
  });

  it('should throw on negative amounts', () => {
    const raw: RawTrec20 = {
      buyer_names: ['Buyer'],
      seller_names: ['Seller'],
      property_address: {
        street: '123 St',
        city: 'City',
        state: 'TX',
        zip: '12345'
      },
      sales_price: {
        cash_portion: '-1000',
        financed_portion: '',
        total: '1000'
      }
    };

    expect(() => fromRawTrec20(raw)).toThrow('Negative amounts are not allowed');
  });

  it('should handle cash-only transactions', () => {
    const raw: RawTrec20 = {
      buyer_names: ['Cash Buyer'],
      seller_names: ['Seller'],
      property_address: {
        street: '999 Cash Ln',
        city: 'Houston',
        state: 'TX',
        zip: '77001'
      },
      sales_price: {
        cash_portion: '500,000',
        financed_portion: '0',
        total: '500,000'
      },
      financing_type: 'cash'
    };

    const result = fromRawTrec20(raw);
    expect(result.salesPrice.cashPortionCents).toBe(50000000);
    expect(result.salesPrice.financedPortionCents).toBe(0);
    expect(result.salesPrice.totalCents).toBe(50000000);
    expect(result.financingType).toBe('cash');
  });
});