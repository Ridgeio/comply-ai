import { describe, it, expect } from 'vitest'
import { PDFDocument, PDFPage, StandardFonts } from 'pdf-lib'
import { toRawTrec20 } from '../trec20'
import { MockOcr } from '../ocr'

describe('OCR Fallback', () => {
  // Helper to create a non-fillable PDF with text content
  async function createNonFillablePDF(): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([612, 792]) // Letter size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    
    // Add text content that looks like a TREC form
    const textContent = [
      'TREC No. 20-18',
      'Effective: 01/03/2025',
      'ONE TO FOUR FAMILY RESIDENTIAL CONTRACT (RESALE)',
      '',
      'Buyer: Jane Buyer',
      'Seller: John Seller',
      'Property: 123 Main St, Houston, TX 77002',
      '',
      'Total Price: $300,000.00',
      'Option Fee: $200.00',
      'Option Period: 7 days',
      'Closing Date: 02/01/2025',
      '',
      'Special Provisions: Seller to leave fridge.',
      '',
      'Page 1 of 12'
    ]
    
    let yPosition = 750
    for (const line of textContent) {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: 12,
        font,
      })
      yPosition -= 20
    }
    
    return pdfDoc.save()
  }
  
  it('should use OCR fallback when PDF has no AcroForm fields', async () => {
    // Create a non-fillable PDF
    const pdfBuffer = await createNonFillablePDF()
    
    // Mock OCR text that would be extracted
    const mockOcrText = `
TREC No. 20-18
Effective: 01/03/2025
ONE TO FOUR FAMILY RESIDENTIAL CONTRACT (RESALE)

Buyer: Jane Buyer
Seller: John Seller
Property: 123 Main St, Houston, TX 77002

Total Price: $300,000.00
Option Fee: $200.00
Option Period: 7 days
Closing Date: 02/01/2025

Special Provisions: Seller to leave fridge.

Page 1 of 12
`
    
    // Create mock OCR provider
    const mockOcrProvider = new MockOcr(mockOcrText)
    
    // Call toRawTrec20 with OCR provider
    const result = await toRawTrec20(pdfBuffer, { ocrProvider: mockOcrProvider })
    
    // Verify meta indicates OCR mode
    expect(result.meta.mode).toBe('ocr')
    expect(result.meta.version).toContain('20-18')
    
    // Verify extracted data
    const { raw } = result
    expect(raw.buyer_names).toContain('Jane Buyer')
    expect(raw.seller_names).toContain('John Seller')
    expect(raw.property_street_address).toBe('123 Main St')
    expect(raw.property_city).toBe('Houston')
    expect(raw.property_state).toBe('TX')
    expect(raw.property_zip).toBe('77002')
    expect(raw.total_sales_price).toBe('300000.00')
    expect(raw.option_fee).toBe('200.00')
    expect(raw.option_period_days).toBe('7')
    expect(raw.closing_date).toBe('02/01/2025')
    expect(raw.special_provisions).toContain('Seller to leave fridge')
  })
  
  it('should throw error when no OCR provider is configured for non-fillable PDF', async () => {
    const pdfBuffer = await createNonFillablePDF()
    
    await expect(toRawTrec20(pdfBuffer)).rejects.toThrow('OCR provider not configured')
  })
  
  it('should use AcroForm when fields are present (no OCR needed)', async () => {
    // Create a PDF with form fields
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage()
    
    // Add a form field matching TREC20 field mapping
    const form = pdfDoc.getForm()
    const textField = form.createTextField('Buyer1Name')
    textField.setText('AcroForm Buyer')
    textField.addToPage(page, { x: 50, y: 500, width: 200, height: 20 })
    
    const pdfBuffer = await pdfDoc.save()
    
    // Call without OCR provider - should work fine with AcroForm
    const result = await toRawTrec20(pdfBuffer)
    
    expect(result.meta.mode).toBe('acroform')
    expect(result.raw.buyer_names).toContain('AcroForm Buyer')
  })
})