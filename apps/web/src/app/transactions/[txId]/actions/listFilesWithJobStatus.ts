'use server';

import { getAuthenticatedContext } from '@/src/lib/auth-helpers';

export interface FileWithJobStatus {
  id: string;
  name: string;
  path: string;
  created_at: string;
  uploaded_by: string;
  extraction_mode?: 'acroform' | 'ocr';
  job?: {
    status: 'queued' | 'processing' | 'done' | 'error';
    error?: string;
  };
}

export async function listFilesWithJobStatus(
  txId: string
): Promise<{ files: FileWithJobStatus[] }> {
  const { adminClient: supabase } = await getAuthenticatedContext();

  // Try to fetch with extraction_mode first, fall back without it if column doesn't exist
  let files: any[] | null = null;
  let error: any = null;

  // First attempt with extraction_mode
  const result = await supabase
    .from('transaction_files')
    .select(`
      id,
      path,
      created_at,
      uploaded_by,
      extraction_mode,
      ingest_jobs (
        id,
        status,
        error
      )
    `)
    .eq('tx_id', txId)
    .order('created_at', { ascending: false });

  if (result.error && result.error.message?.includes('column transaction_files.extraction_mode does not exist')) {
    // Column doesn't exist, fetch without it
    console.log('extraction_mode column not found, fetching without it');
    const fallbackResult = await supabase
      .from('transaction_files')
      .select(`
        id,
        path,
        created_at,
        uploaded_by,
        ingest_jobs (
          id,
          status,
          error
        )
      `)
      .eq('tx_id', txId)
      .order('created_at', { ascending: false });
    
    files = fallbackResult.data;
    error = fallbackResult.error;
  } else {
    files = result.data;
    error = result.error;
  }

  if (error) {
    console.error('Error fetching files with job status:', error);
    throw new Error('Failed to fetch files');
  }

  // Transform the data to match our interface
  const filesWithStatus: FileWithJobStatus[] = (files || []).map(file => {
    // Extract filename from path
    const pathParts = file.path.split('/');
    const name = pathParts[pathParts.length - 1];
    
    // Get the most recent job
    const job = Array.isArray(file.ingest_jobs) && file.ingest_jobs.length > 0
      ? file.ingest_jobs[0]
      : null;

    return {
      id: file.id,
      name,
      path: file.path,
      created_at: file.created_at,
      uploaded_by: file.uploaded_by,
      extraction_mode: file.extraction_mode,
      job: job ? {
        status: job.status as FileWithJobStatus['job']['status'],
        error: job.error
      } : undefined
    };
  });

  return { files: filesWithStatus };
}