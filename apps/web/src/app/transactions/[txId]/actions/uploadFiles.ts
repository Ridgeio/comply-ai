'use server'

import { buildStoragePath } from '@repo/shared'
import { revalidatePath } from 'next/cache'

import { getAuthenticatedContext } from '@/src/lib/auth-helpers'

export interface UploadedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  extraction_mode?: 'acroform' | 'ocr';
}

export interface UploadResult {
  success: boolean
  files?: Array<{
    name: string
    path: string
    fileId: string
    jobId: string
  }>
  error?: string
}

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const ALLOWED_MIME_TYPE = 'application/pdf'

/**
 * Server action to upload PDF files for a transaction
 * Creates transaction_files and ingest_jobs records
 */
export async function uploadFiles(formData: FormData): Promise<UploadResult> {
  try {
    const { user, adminClient: supabase } = await getAuthenticatedContext()

    // Get transaction ID from form data
    const txId = formData.get('txId') as string
    if (!txId) {
      return { success: false, error: 'Transaction ID is required' }
    }

    // Verify transaction exists and get org_id
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('id, org_id')
      .eq('id', txId)
      .single()

    if (txError || !transaction) {
      return { success: false, error: 'Transaction not found' }
    }

    // Get all files from form data
    const files = formData.getAll('files') as File[]
    if (files.length === 0) {
      return { success: false, error: 'No files provided' }
    }

    const uploadedFiles: UploadResult['files'] = []
    const errors: string[] = []

    // Process each file
    for (const file of files) {
      try {
        // Validate file type
        if (file.type !== ALLOWED_MIME_TYPE) {
          errors.push(`${file.name}: Only PDF files are allowed`)
          continue
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: File size exceeds 20MB limit`)
          continue
        }

        // Build storage path
        const storagePath = buildStoragePath({
          orgId: transaction.org_id,
          txId: transaction.id,
          originalName: file.name
        })

        // Convert File to ArrayBuffer then to Blob for Supabase
        const arrayBuffer = await file.arrayBuffer()
        const blob = new Blob([arrayBuffer], { type: file.type })

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('transactions')
          .upload(storagePath, blob, {
            contentType: file.type,
            upsert: false
          })

        if (uploadError) {
          errors.push(`${file.name}: Upload failed - ${uploadError.message}`)
          continue
        }

        // Create transaction_files record
        const { data: fileRecord, error: fileError } = await supabase
          .from('transaction_files')
          .insert({
            tx_id: transaction.id,
            org_id: transaction.org_id,
            path: storagePath,
            kind: 'contract',
            uploaded_by: user.id
          })
          .select()
          .single()

        if (fileError) {
          // Rollback: delete uploaded file
          await supabase.storage
            .from('transactions')
            .remove([storagePath])
          
          errors.push(`${file.name}: Database error - ${fileError.message}`)
          continue
        }

        // Create ingest_jobs record
        const { data: jobRecord, error: jobError } = await supabase
          .from('ingest_jobs')
          .insert({
            org_id: transaction.org_id,
            tx_id: transaction.id,
            file_id: fileRecord.id,
            status: 'queued'
          })
          .select()
          .single()

        if (jobError) {
          // Note: We don't rollback here as the file is already saved
          // The job can be created manually or via retry mechanism
          console.error('Failed to create ingest job:', jobError)
        }

        uploadedFiles.push({
          name: file.name,
          path: storagePath,
          fileId: fileRecord.id,
          jobId: jobRecord?.id || 'pending'
        })

      } catch (fileError) {
        console.error(`Error processing ${file.name}:`, fileError)
        errors.push(`${file.name}: Unexpected error`)
      }
    }

    // Revalidate the transaction page
    revalidatePath(`/transactions/${txId}`)

    if (uploadedFiles.length === 0 && errors.length > 0) {
      return { 
        success: false, 
        error: errors.join('; ') 
      }
    }

    return {
      success: true,
      files: uploadedFiles,
      error: errors.length > 0 ? `Partial success. Errors: ${errors.join('; ')}` : undefined
    }

  } catch (error) {
    console.error('Upload action error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Get the status of files for a transaction
 */
export async function getTransactionFiles(txId: string) {
  try {
    const { adminClient: supabase } = await getAuthenticatedContext()
    
    const { data: files, error } = await supabase
      .from('transaction_files')
      .select(`
        *,
        ingest_jobs (
          id,
          status,
          error,
          updated_at
        )
      `)
      .eq('tx_id', txId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transaction files:', error)
      return { success: false, files: [], error: error.message }
    }

    return { success: true, files: files || [] }
  } catch (error) {
    console.error('Error in getTransactionFiles:', error)
    return { 
      success: false, 
      files: [], 
      error: error instanceof Error ? error.message : 'Failed to fetch files' 
    }
  }
}

// Enhanced upload function that returns extraction mode
export async function uploadFilesEnhanced(
  txId: string,
  formData: FormData
): Promise<{ files: UploadedFile[] }> {
  const uploadFormData = new FormData();
  uploadFormData.append('txId', txId);
  
  // Transfer files from incoming formData
  const files = formData.getAll('files');
  files.forEach(file => uploadFormData.append('files', file));
  
  const result = await uploadFiles(uploadFormData);
  
  if (!result.success || !result.files) {
    throw new Error(result.error || 'Upload failed');
  }
  
  // Map to UploadedFile format
  return {
    files: result.files.map(f => ({
      id: f.fileId,
      name: f.name,
      path: f.path,
      size: 0, // Will be filled by the actual implementation
      extraction_mode: undefined // Will be determined during processing
    }))
  };
}