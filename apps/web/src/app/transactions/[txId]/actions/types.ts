// Types for file actions - no 'use server' directive here
export interface FileWithJobStatus {
  id: string
  path: string
  name: string
  uploaded_by: string
  created_at: string
  job_status: 'queued' | 'processing' | 'completed' | 'error'
  job_id: string
  job_error?: string
  extraction_mode?: 'acroform' | 'ocr'
}