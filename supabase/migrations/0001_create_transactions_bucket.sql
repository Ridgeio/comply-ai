-- Create private transactions bucket for storing transaction files
-- This bucket will not allow public access

-- Insert the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'transactions',
  'transactions', 
  false, -- private bucket
  false,
  52428800, -- 50MB limit
  NULL -- allow all mime types
)
ON CONFLICT (id) DO UPDATE
SET 
  public = false,
  file_size_limit = 52428800;

-- Create RLS policies for the transactions bucket
-- These policies ensure only authenticated users can access their own files

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can upload files to their own folder
CREATE POLICY "Users can upload their own transaction files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'transactions' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Authenticated users can view their own files
CREATE POLICY "Users can view their own transaction files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'transactions' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Authenticated users can update their own files
CREATE POLICY "Users can update their own transaction files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'transactions' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'transactions' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Authenticated users can delete their own files
CREATE POLICY "Users can delete their own transaction files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'transactions' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Service role can do everything (for admin operations)
CREATE POLICY "Service role has full access to transactions"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'transactions')
WITH CHECK (bucket_id = 'transactions');