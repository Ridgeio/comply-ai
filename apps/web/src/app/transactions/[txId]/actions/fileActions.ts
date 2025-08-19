'use server'

import type { FileWithJobStatus } from './types'

import { getAuthenticatedContext } from '@/src/lib/auth-helpers'

/**
 * List all files for a transaction with their job status
 */
export async function listFilesWithJobStatus(txId: string): Promise<FileWithJobStatus[]> {
  try {
    const { user, adminClient: supabase } = await getAuthenticatedContext()
    
    // Verify user has access to this transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('org_id')
      .eq('id', txId)
      .single()
    
    if (txError || !transaction) {
      throw new Error('Transaction not found')
    }
    
    // Check user is member of the org
    const { data: membership } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', transaction.org_id)
      .eq('user_id', user.id)
      .single()
    
    if (!membership) {
      throw new Error('You do not have access to this transaction')
    }
    
    // Get files with their latest job status and extraction mode
    const { data: files, error } = await supabase
      .from('transaction_files')
      .select(`
        id,
        path,
        uploaded_by,
        created_at,
        extraction_mode,
        ingest_jobs!inner (
          id,
          status,
          error
        )
      `)
      .eq('tx_id', txId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching files:', error)
      throw new Error('Failed to fetch files')
    }
    
    // Transform the data to match our interface
    return (files || []).map(file => {
      // Extract filename from path
      const name = file.path.split('/').pop() || 'unknown.pdf'
      
      // Get the latest job (ingest_jobs is an array due to the join)
      const latestJob = Array.isArray(file.ingest_jobs) 
        ? file.ingest_jobs[0] 
        : file.ingest_jobs
      
      return {
        id: file.id,
        path: file.path,
        name,
        uploaded_by: file.uploaded_by,
        created_at: file.created_at,
        job_status: latestJob?.status || 'queued',
        job_id: latestJob?.id || '',
        job_error: latestJob?.error
      }
    })
  } catch (error) {
    console.error('Error in listFilesWithJobStatus:', error)
    return []
  }
}

/**
 * Get a signed URL for viewing a file
 */
export async function getSignedUrl(path: string): Promise<{ signedUrl?: string; error?: string }> {
  try {
    const { user, adminClient: supabase } = await getAuthenticatedContext()
    
    // Verify user has access to this file
    const { data: file, error: fileError } = await supabase
      .from('transaction_files')
      .select(`
        id,
        transactions!inner (
          org_id
        )
      `)
      .eq('path', path)
      .single()
    
    if (fileError || !file) {
      return { error: 'File not found' }
    }
    
    // Check user is member of the org
    const { data: membership } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', file.transactions.org_id)
      .eq('user_id', user.id)
      .single()
    
    if (!membership) {
      return { error: 'You do not have access to this file' }
    }
    
    // Generate signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from('transactions')
      .createSignedUrl(path, 3600)
    
    if (error) {
      console.error('Error creating signed URL:', error)
      return { error: 'Failed to generate signed URL' }
    }
    
    return { signedUrl: data.signedUrl }
  } catch (error) {
    console.error('Error in getSignedUrl:', error)
    return { error: error instanceof Error ? error.message : 'Failed to get signed URL' }
  }
}