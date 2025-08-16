import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { FilesTab } from '../FilesTab'

// Mock the file actions
vi.mock('@/src/app/transactions/[txId]/actions/uploadFiles', () => ({
  uploadFiles: vi.fn()
}))

vi.mock('@/src/app/transactions/[txId]/actions/fileActions', () => ({
  listFilesWithJobStatus: vi.fn(),
  getSignedUrl: vi.fn()
}))

vi.mock('@/src/app/transactions/[txId]/actions/reportActions', () => ({
  generateReport: vi.fn()
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}))

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({}),
    getInputProps: () => ({}),
    isDragActive: false
  })
}))

describe('Scanned Mode Banner', () => {
  it('should show scanned mode banner when file has OCR extraction mode', async () => {
    const { listFilesWithJobStatus } = await import('@/src/app/transactions/[txId]/actions/fileActions')
    
    // Mock files with OCR extraction mode
    vi.mocked(listFilesWithJobStatus).mockResolvedValue([
      {
        id: 'file-1',
        path: 'path/to/file.pdf',
        name: 'contract.pdf',
        uploaded_by: 'user-123',
        created_at: '2025-01-15T10:00:00Z',
        job_status: 'completed',
        job_id: 'job-1',
        extraction_mode: 'ocr' // This indicates OCR was used
      }
    ])
    
    render(<FilesTab txId="tx-123" />)
    
    // Wait for the banner to appear
    const banner = await screen.findByText(/Scanned mode may reduce accuracy/i)
    expect(banner).toBeInTheDocument()
    
    // Verify it's in an alert component
    const alert = banner.closest('[role="alert"]')
    expect(alert).toBeInTheDocument()
  })
  
  it('should not show banner when file uses AcroForm extraction', async () => {
    const { listFilesWithJobStatus } = await import('@/src/app/transactions/[txId]/actions/fileActions')
    
    // Mock files with AcroForm extraction mode
    vi.mocked(listFilesWithJobStatus).mockResolvedValue([
      {
        id: 'file-2',
        path: 'path/to/file.pdf',
        name: 'contract.pdf',
        uploaded_by: 'user-123',
        created_at: '2025-01-15T10:00:00Z',
        job_status: 'completed',
        job_id: 'job-2',
        extraction_mode: 'acroform'
      }
    ])
    
    render(<FilesTab txId="tx-123" />)
    
    // Wait for files to load
    await screen.findByText('contract.pdf')
    
    // Banner should not be present
    const banner = screen.queryByText(/Scanned mode may reduce accuracy/i)
    expect(banner).not.toBeInTheDocument()
  })
  
  it('should not show banner when extraction mode is not set', async () => {
    const { listFilesWithJobStatus } = await import('@/src/app/transactions/[txId]/actions/fileActions')
    
    // Mock files without extraction mode
    vi.mocked(listFilesWithJobStatus).mockResolvedValue([
      {
        id: 'file-3',
        path: 'path/to/file.pdf',
        name: 'contract.pdf',
        uploaded_by: 'user-123',
        created_at: '2025-01-15T10:00:00Z',
        job_status: 'completed',
        job_id: 'job-3',
        extraction_mode: undefined
      }
    ])
    
    render(<FilesTab txId="tx-123" />)
    
    // Wait for files to load
    await screen.findByText('contract.pdf')
    
    // Banner should not be present
    const banner = screen.queryByText(/Scanned mode may reduce accuracy/i)
    expect(banner).not.toBeInTheDocument()
  })
})