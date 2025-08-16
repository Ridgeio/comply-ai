'use server';

import { toRawTrec20 } from '@repo/parsers';
import { fromRawTrec20 } from '@repo/shared';
import { createClient } from '@repo/shared/supabase/server';

/**
 * Development action to test PDF parsing and normalization pipeline
 * This combines the parsers package with the shared mapper
 * NOT FOR PRODUCTION USE
 */
export async function parseAndNormalizeForDebug(fileId: string) {
  const supabase = await createClient();
  
  // Get the file metadata from database
  const { data: file, error: fileError } = await supabase
    .from('files')
    .select('*')
    .eq('id', fileId)
    .single();
    
  if (fileError || !file) {
    return { 
      success: false, 
      error: 'File not found',
      fileId 
    };
  }
  
  // Download the file from storage
  const { data: fileData, error: downloadError } = await supabase
    .storage
    .from('uploads')
    .download(file.storage_path);
    
  if (downloadError || !fileData) {
    return { 
      success: false, 
      error: 'Failed to download file',
      fileId,
      storagePath: file.storage_path 
    };
  }
  
  try {
    // Convert blob to Uint8Array
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // Extract raw data from PDF
    const rawData = await toRawTrec20(buffer);
    
    // Convert to typed, validated model
    const typedData = fromRawTrec20(rawData);
    
    return {
      success: true,
      fileId,
      fileName: file.name,
      raw: rawData,
      typed: typedData,
      summary: {
        buyers: typedData.buyerNames.join(', '),
        sellers: typedData.sellerNames.join(', '),
        property: `${typedData.propertyAddress.street}, ${typedData.propertyAddress.city}, ${typedData.propertyAddress.state}`,
        priceFormatted: `$${(typedData.salesPrice.totalCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        effectiveDate: typedData.effectiveDate,
        formVersion: typedData.formVersion
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      fileId
    };
  }
}

/**
 * Example usage snippet (for documentation)
 * 
 * ```typescript
 * import { toRawTrec20 } from '@repo/parsers';
 * import { fromRawTrec20 } from '@repo/shared';
 * 
 * // Step 1: Extract raw data from PDF
 * const pdfBuffer: Uint8Array = // ... load PDF
 * const rawData = await toRawTrec20(pdfBuffer);
 * // Returns: RawTrec20 with string values
 * 
 * // Step 2: Convert to typed, validated model
 * const typedData = fromRawTrec20(rawData);
 * // Returns: Trec20 with proper types (cents, ISO dates, enums)
 * 
 * // Now you have:
 * // - typedData.salesPrice.totalCents (number)
 * // - typedData.effectiveDate (ISO string "2025-01-03")
 * // - typedData.financingType (enum)
 * // - All validated by Zod schemas
 * ```
 */