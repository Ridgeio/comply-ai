-- Add extraction_mode column to track whether OCR or AcroForm was used
ALTER TABLE public.transaction_files
  ADD COLUMN IF NOT EXISTS extraction_mode TEXT 
  CHECK (extraction_mode IN ('acroform', 'ocr'));

-- Add comment for documentation
COMMENT ON COLUMN public.transaction_files.extraction_mode IS 
  'Indicates whether the file was processed using AcroForm fields or OCR. NULL for unprocessed files.';