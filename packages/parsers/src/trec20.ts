import type { RawTrec20 } from './types';
import { TREC20_FIELD_MAPPINGS } from './mappings/trec20.acroform';
import { readAcroForm } from './acroform';
import { detectVersion } from './versionDetector';

const VALID_FINANCING_TYPES = ['cash', 'conventional', 'fha', 'va', 'other'] as const;

/**
 * Extract raw TREC20 data from a PDF buffer
 * Combines form field extraction with version detection
 */
export async function toRawTrec20(buffer: Uint8Array): Promise<RawTrec20 & { formVersion?: string }> {
  // Extract form fields
  const fields = await readAcroForm(buffer);
  
  // Map to raw structure
  const rawData = mapAcroformToRawTrec20(fields);
  
  // Detect version
  const versionInfo = await detectVersion(buffer);
  
  // Combine results
  return {
    ...rawData,
    formVersion: versionInfo.version
  };
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