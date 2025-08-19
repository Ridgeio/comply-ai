import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { FilesTab } from '../FilesTab';

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock server actions
vi.mock('@/src/app/transactions/[txId]/actions/uploadFiles', () => ({
  uploadFilesEnhanced: vi.fn()
}));

vi.mock('@/src/app/transactions/[txId]/actions/listFilesWithJobStatus', () => ({
  listFilesWithJobStatus: vi.fn(() => Promise.resolve({ files: [] }))
}));

vi.mock('@/src/app/transactions/[txId]/actions/getSignedUrl', () => ({
  getSignedUrl: vi.fn()
}));

describe('Files Tab', () => {
  it('should render upload dropzone', () => {
    render(<FilesTab txId="test-123" />);
    
    expect(screen.getByTestId('upload-dropzone')).toBeInTheDocument();
    expect(screen.getByText('Upload Files')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop PDF files')).toBeInTheDocument();
  });

  it('should show empty state when no files', () => {
    render(<FilesTab txId="test-123" />);
    
    expect(screen.getByText('No files uploaded yet')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop PDF files above to get started')).toBeInTheDocument();
  });

  it('should display files with status badges', () => {
    const mockFiles = [{
      id: 'file-1',
      name: 'contract.pdf',
      path: 'files/contract.pdf',
      created_at: '2025-01-17T10:00:00Z',
      uploaded_by: 'user-1',
      extraction_mode: 'acroform' as const,
      job: { status: 'done' as const }
    }];

    render(<FilesTab txId="test-123" initialFiles={mockFiles} />);
    
    expect(screen.getByText('contract.pdf')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('AcroForm')).toBeInTheDocument();
  });

  it('should show OCR banner for scanned files', () => {
    const mockFiles = [{
      id: 'file-1',
      name: 'scanned.pdf',
      path: 'files/scanned.pdf',
      created_at: '2025-01-17T10:00:00Z',
      uploaded_by: 'user-1',
      extraction_mode: 'ocr' as const,
      job: { status: 'done' as const }
    }];

    render(<FilesTab txId="test-123" initialFiles={mockFiles} />);
    
    expect(screen.getByText('Scanned Mode')).toBeInTheDocument();
    expect(screen.getByText(/OCR extraction/)).toBeInTheDocument();
    expect(screen.getByText('Scanned (OCR)')).toBeInTheDocument();
  });

  it('should show different status badges', () => {
    const mockFiles = [
      {
        id: 'file-1',
        name: 'queued.pdf',
        path: 'files/queued.pdf',
        created_at: '2025-01-17T10:00:00Z',
        uploaded_by: 'user-1',
        job: { status: 'queued' as const }
      },
      {
        id: 'file-2',
        name: 'processing.pdf',
        path: 'files/processing.pdf',
        created_at: '2025-01-17T10:00:00Z',
        uploaded_by: 'user-1',
        job: { status: 'processing' as const }
      },
      {
        id: 'file-3',
        name: 'error.pdf',
        path: 'files/error.pdf',
        created_at: '2025-01-17T10:00:00Z',
        uploaded_by: 'user-1',
        job: { status: 'error' as const }
      }
    ];

    render(<FilesTab txId="test-123" initialFiles={mockFiles} />);
    
    expect(screen.getByText('Queued')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should disable View button when file not done', () => {
    const mockFiles = [{
      id: 'file-1',
      name: 'processing.pdf',
      path: 'files/processing.pdf',
      created_at: '2025-01-17T10:00:00Z',
      uploaded_by: 'user-1',
      job: { status: 'processing' as const }
    }];

    render(<FilesTab txId="test-123" initialFiles={mockFiles} />);
    
    const viewButton = screen.getByRole('button', { name: /view/i });
    expect(viewButton).toBeDisabled();
  });

  it('should enable View button when file is done', () => {
    const mockFiles = [{
      id: 'file-1',
      name: 'done.pdf',
      path: 'files/done.pdf',
      created_at: '2025-01-17T10:00:00Z',
      uploaded_by: 'user-1',
      job: { status: 'done' as const }
    }];

    render(<FilesTab txId="test-123" initialFiles={mockFiles} />);
    
    const viewButton = screen.getByRole('button', { name: /view/i });
    expect(viewButton).not.toBeDisabled();
  });
});