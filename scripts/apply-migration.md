# Apply Missing Database Migration

The application is encountering an error because the `extraction_mode` column is missing from the `transaction_files` table in your remote Supabase database.

## Quick Fix Applied
I've modified the `listFilesWithJobStatus` function to handle the missing column gracefully. The application should now work without errors.

## Permanent Fix - Apply the Migration

To permanently fix this issue, you need to add the missing column to your database:

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (zygaagumqbloombllcdk)
3. Navigate to the SQL Editor
4. Copy and paste the contents of `scripts/apply-extraction-mode-migration.sql`
5. Click "Run" to execute the migration

### Option 2: Using Supabase CLI
If you have Docker running locally:
```bash
# Start Docker Desktop first
# Then run:
npx supabase start
npx supabase db push
```

### Option 3: Using psql
```bash
psql "postgresql://postgres:[YOUR_PASSWORD]@db.zygaagumqbloombllcdk.supabase.co:5432/postgres" < scripts/apply-extraction-mode-migration.sql
```

## What the Migration Does
This migration adds an `extraction_mode` column to the `transaction_files` table that tracks whether a PDF was processed using:
- `'acroform'` - For fillable PDFs with form fields
- `'ocr'` - For scanned PDFs requiring OCR processing
- `NULL` - For unprocessed files

## Verification
After applying the migration, the application will automatically use the new column. The temporary fallback code can be removed once the migration is confirmed successful.