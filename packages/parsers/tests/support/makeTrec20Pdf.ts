import { PDFDocument, PDFTextField, rgb, StandardFonts } from 'pdf-lib';

export interface TestTrec20Data {
  buyer1Name?: string;
  buyer2Name?: string;
  seller1Name?: string;
  seller2Name?: string;
  propertyStreet?: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  salesPriceTotal?: string;
  salesPriceCash?: string;
  salesPriceLoan?: string;
  effectiveDate?: string;
  closingDate?: string;
  optionFee?: string;
  optionPeriodDays?: string;
  financingType?: string;
  specialProvisions?: string;
  includeVersionText?: boolean;
  versionText?: string;
  effectiveDateText?: string;
}

export async function makeTrec20Pdf(data: TestTrec20Data = {}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  
  // Add form
  const form = pdfDoc.getForm();
  
  // Create text fields with our standard field names
  const fieldData = [
    { name: 'Buyer1Name', value: data.buyer1Name || '' },
    { name: 'Buyer2Name', value: data.buyer2Name || '' },
    { name: 'Seller1Name', value: data.seller1Name || '' },
    { name: 'Seller2Name', value: data.seller2Name || '' },
    { name: 'PropertyStreet', value: data.propertyStreet || '' },
    { name: 'PropertyCity', value: data.propertyCity || '' },
    { name: 'PropertyState', value: data.propertyState || '' },
    { name: 'PropertyZip', value: data.propertyZip || '' },
    { name: 'SalesPriceTotal', value: data.salesPriceTotal || '' },
    { name: 'SalesPriceCash', value: data.salesPriceCash || '' },
    { name: 'SalesPriceLoan', value: data.salesPriceLoan || '' },
    { name: 'EffectiveDate', value: data.effectiveDate || '' },
    { name: 'ClosingDate', value: data.closingDate || '' },
    { name: 'OptionFee', value: data.optionFee || '' },
    { name: 'OptionPeriodDays', value: data.optionPeriodDays || '' },
    { name: 'FinancingType', value: data.financingType || '' },
    { name: 'SpecialProvisions', value: data.specialProvisions || '' }
  ];
  
  let yPosition = 700;
  fieldData.forEach(({ name, value }) => {
    const field = form.createTextField(name);
    field.setText(value);
    field.addToPage(page, { x: 100, y: yPosition, width: 200, height: 20 });
    yPosition -= 30;
  });
  
  // Add version text if requested (for version detection tests)
  if (data.includeVersionText) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const versionString = data.versionText || 'TREC No. 20-18';
    const effectiveString = data.effectiveDateText || 'Effective: 01/03/2025';
    
    // Draw text on the page (visual representation)
    page.drawText(versionString, {
      x: 50,
      y: 750,
      size: 12,
      font,
      color: rgb(0, 0, 0)
    });
    
    page.drawText(effectiveString, {
      x: 50,
      y: 730,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    
    // Add hidden form fields for version detection
    // This is a workaround for synthetic PDFs since pdf-lib text isn't extractable
    const versionField = form.createTextField('__VERSION__');
    versionField.setText(versionString);
    versionField.addToPage(page, { x: -1000, y: -1000, width: 1, height: 1 }); // Off-screen
    
    const effectiveField = form.createTextField('__EFFECTIVE__');
    effectiveField.setText(effectiveString);
    effectiveField.addToPage(page, { x: -1000, y: -1000, width: 1, height: 1 }); // Off-screen
  }
  
  return pdfDoc.save();
}