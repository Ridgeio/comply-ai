'use server';

import { readAcroForm, detectVersion } from '@repo/parsers';
import { createClient } from '@repo/shared';

/**
 * Debug action to test PDF parsing functionality
 * This is for development testing only - not used in production UI
 */
export async function parseFileForDebug(fileId: string) {
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
    
    // Run parsers
    const [formFields, versionInfo] = await Promise.all([
      readAcroForm(buffer),
      detectVersion(buffer)
    ]);
    
    return {
      success: true,
      fileId,
      fileName: file.name,
      formFields,
      versionInfo,
      fieldCount: Object.keys(formFields).length
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
 * Debug action to test PDF parsing with a direct buffer
 * This allows testing without going through storage
 */
export async function parseBufferForDebug(buffer: Uint8Array) {
  try {
    const [formFields, versionInfo] = await Promise.all([
      readAcroForm(buffer),
      detectVersion(buffer)
    ]);
    
    return {
      success: true,
      formFields,
      versionInfo,
      fieldCount: Object.keys(formFields).length
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    };
  }
}