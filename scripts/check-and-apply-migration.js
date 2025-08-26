#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configuration from .env.local
const SUPABASE_URL = 'https://zygaagumqbloombllcdk.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Z2FhZ3VtcWJsb29tYmxsY2RrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc2ODk2OSwiZXhwIjoyMDcwMzQ0OTY5fQ.nmHvcXCsg-W3c0E9kf4dWd4ZvY_jYOXD-tdjJUB6e9M';

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  }
});

async function checkColumn() {
  console.log('Checking if extraction_mode column exists...');
  
  // Try to query the column
  const { data, error } = await supabase
    .from('transaction_files')
    .select('extraction_mode')
    .limit(1);
  
  if (error && error.message.includes('column transaction_files.extraction_mode does not exist')) {
    console.log('❌ Column does not exist');
    return false;
  } else if (error) {
    console.error('Error checking column:', error);
    return null;
  } else {
    console.log('✅ Column already exists');
    return true;
  }
}

async function main() {
  const columnExists = await checkColumn();
  
  if (columnExists === false) {
    console.log('\n⚠️  The extraction_mode column needs to be added to the database.');
    console.log('\nTo apply the migration, please:\n');
    console.log('1. Go to Supabase Dashboard SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/zygaagumqbloombllcdk/sql/new\n');
    console.log('2. Copy and paste this SQL:');
    console.log('─'.repeat(60));
    console.log(`
-- Add extraction_mode column to track whether OCR or AcroForm was used
ALTER TABLE public.transaction_files
  ADD COLUMN IF NOT EXISTS extraction_mode TEXT 
  CHECK (extraction_mode IN ('acroform', 'ocr'));

-- Add comment for documentation
COMMENT ON COLUMN public.transaction_files.extraction_mode IS 
  'Indicates whether the file was processed using AcroForm fields or OCR. NULL for unprocessed files.';
    `);
    console.log('─'.repeat(60));
    console.log('\n3. Click "Run" to execute the migration\n');
    console.log('The application is currently using a fallback to work without this column,');
    console.log('but applying the migration will improve performance.\n');
  } else if (columnExists === true) {
    console.log('\n✅ Database schema is up to date!');
    console.log('The extraction_mode column is already present.\n');
    
    // Remove the fallback code since column exists
    console.log('You can now remove the fallback code from listFilesWithJobStatus.ts');
  }
}

main().catch(console.error);