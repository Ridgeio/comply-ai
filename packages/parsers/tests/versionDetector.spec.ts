import { describe, it, expect } from 'vitest';
import { detectVersion } from '../src/versionDetector';
import { makeTrec20Pdf } from './support/makeTrec20Pdf';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

describe('detectVersion', () => {
  it('should detect TREC 20-18 form with version and effective date', async () => {
    const pdfBuffer = await makeTrec20Pdf({
      includeVersionText: true,
      versionText: 'TREC No. 20-18',
      effectiveDateText: 'Effective: 01/03/2025'
    });
    
    const result = await detectVersion(pdfBuffer);
    
    expect(result.form).toBe('TREC-20');
    expect(result.version).toBe('20-18');
    expect(result.effectiveDateText).toBe('01/03/2025');
  });
  
  it('should detect variations of TREC 20-18 text', async () => {
    const pdfBuffer = await makeTrec20Pdf({
      includeVersionText: true,
      versionText: 'TREC   No.  20-18',  // Extra spaces
      effectiveDateText: 'Effective Date: January 3, 2025'
    });
    
    const result = await detectVersion(pdfBuffer);
    
    expect(result.form).toBe('TREC-20');
    expect(result.version).toBe('20-18');
    expect(result.effectiveDateText).toContain('January 3, 2025');
  });
  
  it('should return unknown for non-TREC forms', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    page.drawText('Some Other Form', {
      x: 50,
      y: 750,
      size: 12,
      font,
      color: rgb(0, 0, 0)
    });
    
    const pdfBuffer = await pdfDoc.save();
    const result = await detectVersion(pdfBuffer);
    
    expect(result.form).toBe('unknown');
    expect(result.version).toBeUndefined();
  });
  
  it('should handle PDFs with no text content', async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage();
    const pdfBuffer = await pdfDoc.save();
    
    const result = await detectVersion(pdfBuffer);
    
    expect(result.form).toBe('unknown');
    expect(result.version).toBeUndefined();
    expect(result.effectiveDateText).toBeUndefined();
  });
});