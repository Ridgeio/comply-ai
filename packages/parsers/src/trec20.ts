import type { RawTrec20 } from './types';
import { TREC20_FIELD_MAPPINGS } from './mappings/trec20.acroform';
import { readAcroForm } from './acroform';
import { detectVersion, detectVersionFromText } from './versionDetector';
import { OcrProvider, parseRawFromOcrText } from './ocr';

const VALID_FINANCING_TYPES = ['cash', 'conventional', 'fha', 'va', 'other'] as const;

export type ExtractionMode = 'acroform' | 'ocr';

export interface Trec20Result {
  raw: RawTrec20;
  meta: {
    mode: ExtractionMode;
    version?: string;
  };
}

/**
 * Extract raw TREC20 data from a PDF buffer
 * Combines form field extraction with version detection
 * Falls back to OCR if no form fields are found
 */
export async function toRawTrec20(
  buffer: Uint8Array, 
  opts?: { ocrProvider?: OcrProvider }
): Promise<Trec20Result> {
  // Try to extract form fields first
  const fields = await readAcroForm(buffer);
  
  // Check if we have meaningful data fields (not just signature fields)
  const meaningfulFields = Object.keys(fields).filter(key => 
    !key.toLowerCase().includes('signature') && 
    !key.toLowerCase().includes('initial')
  );
  
  if (meaningfulFields.length > 0) {
    // Use AcroForm extraction
    const rawData = mapAcroformToRawTrec20(fields);
    const versionInfo = await detectVersion(buffer);
    
    return {
      raw: {
        ...rawData,
        formVersion: versionInfo.version
      },
      meta: {
        mode: 'acroform',
        version: versionInfo.version
      }
    };
  }
  
  // No fields found - need OCR
  if (!opts?.ocrProvider) {
    throw new Error('OCR provider not configured for non-fillable PDF');
  }
  
  // Use OCR to extract text
  const ocrResult = await opts.ocrProvider.recognize(buffer);
  const ocrFields = parseRawFromOcrText(ocrResult.fullText);
  
  // Convert OCR fields to RawTrec20 format
  const rawData = mapOcrToRawTrec20(ocrFields);
  
  // Detect version from OCR text
  const version = detectVersionFromText(ocrResult.fullText);
  
  return {
    raw: {
      ...rawData,
      formVersion: version
    },
    meta: {
      mode: 'ocr',
      version
    }
  };
}

/**
 * Map OCR-extracted fields to RawTrec20 structure
 */
function mapOcrToRawTrec20(fields: Record<string, string>): RawTrec20 {
  const result: RawTrec20 = {
    buyer_names: fields.buyer_names ? [fields.buyer_names] : [],
    seller_names: fields.seller_names ? [fields.seller_names] : [],
    property_address: {
      street: fields.property_street_address || '',
      city: fields.property_city || '',
      state: fields.property_state || '',
      zip: fields.property_zip || ''
    },
    sales_price: {
      cash_portion: '',
      financed_portion: '',
      total: fields.total_sales_price || ''
    },
    property_street_address: fields.property_street_address,
    property_city: fields.property_city,
    property_state: fields.property_state,
    property_zip: fields.property_zip,
    total_sales_price: fields.total_sales_price,
    option_fee: fields.option_fee,
    option_period_days: fields.option_period_days,
    closing_date: fields.closing_date,
    special_provisions: fields.special_provisions,
    earnest_money: fields.earnest_money,
    title_company: fields.title_company,
    effective_date: fields.effective_date,
    hoa_fees: fields.hoa_fees,
    survey: fields.survey,
    financing: fields.financing
  };
  
  return result;
}

export function mapAcroformToRawTrec20(fields: Record<string, string>): RawTrec20 {
  // Initialize with default structure
  const result: RawTrec20 = {
    buyer_names: [],
    seller_names: [],
    property_address: {
      street: '',
      city: '',
      state: '',
      zip: ''
    },
    sales_price: {
      cash_portion: '',
      financed_portion: '',
      total: ''
    }
  };
  
  // Process each mapping
  for (const mapping of TREC20_FIELD_MAPPINGS) {
    const fieldValue = fields[mapping.fieldName] || '';
    
    // Skip empty values for optional fields
    if (!fieldValue && mapping.path[0] !== 'property_address' && mapping.path[0] !== 'sales_price') {
      continue;
    }
    
    // Handle array fields (buyer_names, seller_names)
    if (mapping.arrayIndex !== undefined) {
      const arrayPath = mapping.path[0] as keyof Pick<RawTrec20, 'buyer_names' | 'seller_names'>;
      const arr = result[arrayPath] as string[];
      
      if (fieldValue) {
        // Ensure array is long enough
        while (arr.length <= mapping.arrayIndex) {
          arr.push('');
        }
        arr[mapping.arrayIndex] = fieldValue;
      }
    }
    // Handle nested object fields
    else if (mapping.path.length === 2) {
      const objPath = mapping.path[0] as keyof RawTrec20;
      const propPath = mapping.path[1];
      
      if (objPath === 'property_address') {
        (result.property_address as any)[propPath] = fieldValue;
      } else if (objPath === 'sales_price') {
        (result.sales_price as any)[propPath] = fieldValue;
      }
    }
    // Handle simple fields
    else {
      const fieldPath = mapping.path[0] as keyof RawTrec20;
      
      // Special handling for financing_type - validate the value
      if (fieldPath === 'financing_type') {
        if (VALID_FINANCING_TYPES.includes(fieldValue as any)) {
          (result as any)[fieldPath] = fieldValue;
        }
      } else if (fieldValue) {
        // Only set if there's a value
        (result as any)[fieldPath] = fieldValue;
      }
    }
  }
  
  // Clean up empty array elements
  result.buyer_names = result.buyer_names.filter(name => name !== '');
  result.seller_names = result.seller_names.filter(name => name !== '');
  
  return result;
}