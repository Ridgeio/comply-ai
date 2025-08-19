'use server';

import { getAuthenticatedContext } from '@/src/lib/auth-helpers';

export interface SignedUrlResult {
  url: string;
  expiresAt: string;
}

export async function getSignedUrl(
  path: string
): Promise<SignedUrlResult> {
  const { adminClient: supabase } = await getAuthenticatedContext();

  // Verify the user has access to this file
  const { data: file, error: fileError } = await supabase
    .from('transaction_files')
    .select('id')
    .eq('path', path)
    .single();

  if (fileError || !file) {
    throw new Error('File not found or access denied');
  }

  // Generate a signed URL for the file (expires in 1 hour)
  const { data, error } = await supabase.storage
    .from('transactions')
    .createSignedUrl(path, 3600); // 1 hour expiry

  if (error || !data) {
    console.error('Error creating signed URL:', error);
    throw new Error('Failed to generate download link');
  }

  return {
    url: data.signedUrl,
    expiresAt: new Date(Date.now() + 3600000).toISOString()
  };
}