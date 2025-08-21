import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

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
    const mockFiles = [
      {
        id: 'file-1',
        path: 'path/to/file.pdf',
        name: 'contract.pdf',
        uploaded_by: 'user-123',
        created_at: '2025-01-15T10:00:00Z',
        extraction_mode: 'ocr' as const,
        job: { status: 'done' as const }
      }
    ]
    
    render(<FilesTab txId="tx-123" initialFiles={mockFiles} />)
    
    // Banner should appear immediately
    const banner = screen.getByText(/One or more files required OCR extraction/i)
    expect(banner).toBeInTheDocument()
    
    // Verify it's in an alert component
    const alert = banner.closest('[role="alert"]')
    expect(alert).toBeInTheDocument()
  })
  
  it('should not show banner when file uses AcroForm extraction', async () => {
    const mockFiles = [
      {
        id: 'file-2',
        path: 'path/to/file.pdf',
        name: 'contract.pdf',
        uploaded_by: 'user-123',
        created_at: '2025-01-15T10:00:00Z',
        extraction_mode: 'acroform' as const,
        job: { status: 'done' as const }
      }
    ]
    
    render(<FilesTab txId="tx-123" initialFiles={mockFiles} />)
    
    // Files should be immediately visible
    expect(screen.getByText('contract.pdf')).toBeInTheDocument()
    
    // Banner should not be present
    const banner = screen.queryByText(/One or more files required OCR extraction/i)
    expect(banner).not.toBeInTheDocument()
  })
  
  it('should not show banner when extraction mode is not set', async () => {
    const mockFiles = [
      {
        id: 'file-3',
        path: 'path/to/file.pdf',
        name: 'contract.pdf',
        uploaded_by: 'user-123',
        created_at: '2025-01-15T10:00:00Z',
        extraction_mode: undefined,
        job: { status: 'done' }
      }
    ]
    
    render(<FilesTab txId="tx-123" initialFiles={mockFiles} />)
    
    // Files should be immediately visible
    expect(screen.getByText('contract.pdf')).toBeInTheDocument()
    
    // Banner should not be present
    const banner = screen.queryByText(/One or more files required OCR extraction/i)
    expect(banner).not.toBeInTheDocument()
  })
})