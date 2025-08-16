import { describe, it, expect } from 'vitest';
import { mapAcroformToRawTrec20 } from '../src/trec20';
import { readAcroForm } from '../src/acroform';
import { makeTrec20Pdf } from './support/makeTrec20Pdf';
import type { RawTrec20 } from '../src/types';

describe('mapAcroformToRawTrec20', () => {
  it('should map all fields correctly to RawTrec20 structure', async () => {
    const testData = {
      buyer1Name: 'John Doe',
      buyer2Name: 'Jane Doe',
      seller1Name: 'Bob Smith',
      seller2Name: 'Alice Smith',
      propertyStreet: '123 Main St',
      propertyCity: 'Austin',
      propertyState: 'TX',
      propertyZip: '78701',
      salesPriceTotal: '500000',
      salesPriceCash: '100000',
      salesPriceLoan: '400000',
      effectiveDate: '01/15/2025',
      closingDate: '02/15/2025',
      optionFee: '1000',
      optionPeriodDays: '10',
      financingType: 'conventional',
      specialProvisions: 'Seller to provide home warranty'
    };
    
    const pdfBuffer = await makeTrec20Pdf(testData);
    const fields = await readAcroForm(pdfBuffer);
    const result = mapAcroformToRawTrec20(fields);
    
    expect(result).toEqual<RawTrec20>({
      buyer_names: ['John Doe', 'Jane Doe'],
      seller_names: ['Bob Smith', 'Alice Smith'],
      property_address: {
        street: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zip: '78701'
      },
      sales_price: {
        total: '500000',
        cash_portion: '100000',
        financed_portion: '400000'
      },
      effective_date: '01/15/2025',
      closing_date: '02/15/2025',
      option_fee: '1000',
      option_period_days: '10',
      financing_type: 'conventional',
      special_provisions_text: 'Seller to provide home warranty'
    });
  });
  
  it('should handle missing optional fields', async () => {
    const testData = {
      buyer1Name: 'John Doe',
      propertyStreet: '123 Main St',
      propertyCity: 'Austin',
      propertyState: 'TX',
      propertyZip: '78701',
      salesPriceTotal: '500000'
    };
    
    const pdfBuffer = await makeTrec20Pdf(testData);
    const fields = await readAcroForm(pdfBuffer);
    const result = mapAcroformToRawTrec20(fields);
    
    expect(result.buyer_names).toEqual(['John Doe']);
    expect(result.seller_names).toEqual([]);
    expect(result.property_address).toEqual({
      street: '123 Main St',
      city: 'Austin',
      state: 'TX',
      zip: '78701'
    });
    expect(result.sales_price).toEqual({
      total: '500000',
      cash_portion: '',
      financed_portion: ''
    });
    expect(result.effective_date).toBeUndefined();
    expect(result.option_fee).toBeUndefined();
  });
  
  it('should handle completely empty fields', () => {
    const fields = {};
    const result = mapAcroformToRawTrec20(fields);
    
    expect(result).toEqual<RawTrec20>({
      buyer_names: [],
      seller_names: [],
      property_address: {
        street: '',
        city: '',
        state: '',
        zip: ''
      },
      sales_price: {
        total: '',
        cash_portion: '',
        financed_portion: ''
      },
      effective_date: undefined,
      closing_date: undefined,
      option_fee: undefined,
      option_period_days: undefined,
      financing_type: undefined,
      special_provisions_text: undefined
    });
  });
  
  it('should validate financing type values', () => {
    const validTypes = ['cash', 'conventional', 'fha', 'va', 'other'];
    
    validTypes.forEach(type => {
      const fields = { 'FinancingType': type };
      const result = mapAcroformToRawTrec20(fields);
      expect(result.financing_type).toBe(type);
    });
    
    // Invalid type should be undefined
    const fields = { 'FinancingType': 'invalid' };
    const result = mapAcroformToRawTrec20(fields);
    expect(result.financing_type).toBeUndefined();
  });
});