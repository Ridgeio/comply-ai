import { createServiceClient } from './supabaseTest';
import { readFileSync } from 'fs';

async function uploadTestFile() {
  const supabase = createServiceClient();
  
  console.log('Uploading test PDF file...\n');
  
  // Read the test PDF
  const pdfPath = '/Users/tom/Developer/Ridge.io/comply-ai/packages/parsers/tests/fixtures/real/trec-20-18-houston-2024-11-04.pdf';
  const pdfBuffer = readFileSync(pdfPath);
  
  console.log('PDF file size:', pdfBuffer.length, 'bytes');
  
  // The path we already have in the database
  const storagePath = '0ba29203-4cef-4cfe-99b2-a180d5832a81/ff2a2f75-8011-4794-8887-158c44ec5ed3/2025/08/25/34202b01-56a9-4d3b-8859-8d2c94575222-trec-20-18-houston-2024-11-04.pdf';
  
  console.log('Uploading to path:', storagePath);
  
  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('transactions')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true // Overwrite if exists
    });
  
  if (uploadError) {
    console.error('Upload error:', uploadError);
  } else {
    console.log('✓ File uploaded successfully!');
    
    // Try to download it back to verify
    const { data, error: downloadError } = await supabase
      .storage
      .from('transactions')
      .download(storagePath);
    
    if (downloadError) {
      console.error('Download verification failed:', downloadError);
    } else {
      console.log('✓ File download verified, size:', data.size);
    }
  }
}

uploadTestFile().catch(console.error);