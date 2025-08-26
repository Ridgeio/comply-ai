#!/usr/bin/env node

const https = require('https');

// Configuration from .env.local
const SUPABASE_URL = 'https://zygaagumqbloombllcdk.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Z2FhZ3VtcWJsb29tYmxsY2RrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc2ODk2OSwiZXhwIjoyMDcwMzQ0OTY5fQ.nmHvcXCsg-W3c0E9kf4dWd4ZvY_jYOXD-tdjJUB6e9M';

// Migration SQL
const migrationSQL = `
-- Add extraction_mode column to track whether OCR or AcroForm was used
ALTER TABLE public.transaction_files
  ADD COLUMN IF NOT EXISTS extraction_mode TEXT 
  CHECK (extraction_mode IN ('acroform', 'ocr'));

-- Add comment for documentation
COMMENT ON COLUMN public.transaction_files.extraction_mode IS 
  'Indicates whether the file was processed using AcroForm fields or OCR. NULL for unprocessed files.';
`;

// Function to execute SQL via Supabase REST API
async function executeMigration() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);
  
  // First, try to create the exec_sql function if it doesn't exist
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(query text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE query;
    END;
    $$;
  `;

  console.log('Applying migration to remote database...');
  
  // Use the Supabase SQL execution endpoint
  const options = {
    hostname: 'zygaagumqbloombllcdk.supabase.co',
    path: '/rest/v1/rpc/query',
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  };

  // The Supabase REST API doesn't have a direct SQL execution endpoint
  // We need to use the pg_net extension or create a custom function
  console.log('\nNote: Direct SQL execution via REST API requires a custom function.');
  console.log('Please apply the migration using one of these methods:\n');
  console.log('1. Supabase Dashboard SQL Editor:');
  console.log('   - Go to: https://supabase.com/dashboard/project/zygaagumqbloombllcdk/sql');
  console.log('   - Paste and run the migration SQL\n');
  console.log('2. Use npx supabase db push (requires database password)\n');
  console.log('Migration SQL to run:');
  console.log('=' .repeat(60));
  console.log(migrationSQL);
  console.log('=' .repeat(60));
}

executeMigration();