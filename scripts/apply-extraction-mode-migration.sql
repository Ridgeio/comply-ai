-- Migration: Add extraction_mode column to transaction_files table
-- Run this script in your Supabase SQL Editor to add the missing column

-- Add extraction_mode column to track whether OCR or AcroForm was used
ALTER TABLE public.transaction_files
  ADD COLUMN IF NOT EXISTS extraction_mode TEXT 
  CHECK (extraction_mode IN ('acroform', 'ocr'));

-- Add comment for documentation
COMMENT ON COLUMN public.transaction_files.extraction_mode IS 
  'Indicates whether the file was processed using AcroForm fields or OCR. NULL for unprocessed files.';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'transaction_files'
  AND column_name = 'extraction_mode';