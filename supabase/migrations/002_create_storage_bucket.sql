-- Create storage bucket for transactions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transactions',
  'transactions', 
  false,
  20971520, -- 20MB in bytes
  ARRAY['application/pdf']::text[]
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the storage bucket
CREATE POLICY "Users can view files in their org transactions" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'transactions' AND
  EXISTS (
    SELECT 1 FROM transaction_files tf
    JOIN org_members om ON om.org_id = tf.org_id
    WHERE tf.path = storage.objects.name
    AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload files to their org transactions" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'transactions' AND
  EXISTS (
    SELECT 1 FROM transactions t
    JOIN org_members om ON om.org_id = t.org_id
    WHERE om.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their uploaded files" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'transactions' AND
  EXISTS (
    SELECT 1 FROM transaction_files tf
    JOIN org_members om ON om.org_id = tf.org_id
    WHERE tf.path = storage.objects.name
    AND om.user_id = auth.uid()
  )
);