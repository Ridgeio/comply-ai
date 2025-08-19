import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFDocument } from 'pdf-lib';
import type { VersionDetectionResult } from './types';

// Set worker to use CDN version for compatibility
// In production, you might want to self-host this file
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.js`;

/**
 * Detect version from text content (used by OCR path)
 */
export function detectVersionFromText(text: string): string | undefined {
  // Check for TREC patterns
  const versionPatterns = [
    /TREC\s+No\.\s*([\d-]+)/i,
    /TREC\s+([\d-]+)/i,
    /Form\s+([\d-]+)/i
  ];
  
  for (const pattern of versionPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return undefined;
}

export async function detectVersion(buffer: Uint8Array): Promise<VersionDetectionResult> {
  try {
    let allText = '';
    let versionFromField = '';
    let effectiveFromField = '';
    
    // Check form fields first (for synthetic PDFs)
    try {
      const pdfDoc = await PDFDocument.load(buffer);
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      for (const field of fields) {
        const fieldName = field.getName();
        if (fieldName === '__VERSION__' && 'getText' in field) {
          versionFromField = (field as any).getText() || '';
        }
        if (fieldName === '__EFFECTIVE__' && 'getText' in field) {
          effectiveFromField = (field as any).getText() || '';
        }
      }
      
      // If we found version fields, use them directly
      if (versionFromField) {
        allText = versionFromField + ' ' + effectiveFromField;
      }
    } catch {
      // Ignore pdf-lib errors, continue with pdfjs-dist
    }
    
    // If no version from fields, try text extraction
    if (!allText) {
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        allText += pageText + ' ';
      }
    }
    
    // Check for TREC 20-18 pattern
    const trecPattern = /TREC\s+No\.\s*20-18/i;
    const trecMatch = allText.match(trecPattern);
    
    if (trecMatch) {
      // Extract effective date if present
      let effectiveDateText: string | undefined;
      
      // Try different effective date patterns
      const effectivePatterns = [
        /Effective(?:\s+Date)?:\s*([^\n\r)]+)/i,
        /Effective\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
        /Effective:\s*(\w+\s+\d{1,2},\s+\d{4})/i
      ];
      
      for (const pattern of effectivePatterns) {
        const dateMatch = allText.match(pattern);
        if (dateMatch) {
          effectiveDateText = dateMatch[1].trim();
          break;
        }
      }
      
      return {
        form: 'TREC-20',
        version: '20-18',
        effectiveDateText
      };
    }
    
    return {
      form: 'unknown'
    };
  } catch (error) {
    // Return unknown if we can't parse the PDF
    return {
      form: 'unknown'
    };
  }
}