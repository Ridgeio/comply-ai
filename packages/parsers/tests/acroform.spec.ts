import { describe, it, expect } from 'vitest';
import { readAcroForm } from '../src/acroform';
import { makeTrec20Pdf } from './support/makeTrec20Pdf';

describe('readAcroForm', () => {
  it('should extract all form field values from a PDF', async () => {
    const testData = {
      buyer1Name: 'John Doe',
      buyer2Name: 'Jane Doe',
      propertyStreet: '123 Main St',
      propertyCity: 'Austin',
      propertyState: 'TX',
      propertyZip: '78701',
      salesPriceTotal: '500000'
    };
    
    const pdfBuffer = await makeTrec20Pdf(testData);
    const fields = await readAcroForm(pdfBuffer);
    
    expect(fields).toMatchObject({
      'Buyer1Name': 'John Doe',
      'Buyer2Name': 'Jane Doe',
      'PropertyStreet': '123 Main St',
      'PropertyCity': 'Austin',
      'PropertyState': 'TX',
      'PropertyZip': '78701',
      'SalesPriceTotal': '500000'
    });
  });
  
  it('should return empty strings for empty fields', async () => {
    const pdfBuffer = await makeTrec20Pdf({});
    const fields = await readAcroForm(pdfBuffer);
    
    expect(fields['Buyer1Name']).toBe('');
    expect(fields['PropertyStreet']).toBe('');
    expect(fields['SalesPriceTotal']).toBe('');
  });
  
  it('should handle PDFs without form fields', async () => {
    const pdfDoc = await import('pdf-lib').then(m => m.PDFDocument.create());
    pdfDoc.addPage();
    const pdfBuffer = await pdfDoc.save();
    
    const fields = await readAcroForm(pdfBuffer);
    expect(fields).toEqual({});
  });
});