import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { FilesTab } from '../FilesTab';

import * as signedUrlModule from '@/src/app/transactions/[txId]/actions/getSignedUrl';
import * as listFilesModule from '@/src/app/transactions/[txId]/actions/listFilesWithJobStatus';
import * as uploadFilesModule from '@/src/app/transactions/[txId]/actions/uploadFiles';

// Mock server actions
vi.mock('@/src/app/transactions/[txId]/actions/uploadFiles', () => ({
  uploadFilesEnhanced: vi.fn()
}));

vi.mock('@/src/app/transactions/[txId]/actions/listFilesWithJobStatus', () => ({
  listFilesWithJobStatus: vi.fn()
}));

vi.mock('@/src/app/transactions/[txId]/actions/getSignedUrl', () => ({
  getSignedUrl: vi.fn()
}));

// Mock toast hook
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

// Mock window.open
const mockOpen = vi.fn();
Object.defineProperty(window, 'open', {
  value: mockOpen,
  writable: true
});

describe('Files Tab Behavior', () => {
  const mockTxId = 'test-tx-123';
  let pollCount = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    pollCount = 0;
    
    // Setup default mock responses - ensure proper typing
    vi.mocked(uploadFilesModule.uploadFilesEnhanced).mockResolvedValue({
      files: [
        { id: 'file-1', name: 'contract.pdf', path: 'files/contract.pdf', size: 1024000 },
        { id: 'file-2', name: 'addendum.pdf', path: 'files/addendum.pdf', size: 512000, extraction_mode: 'ocr' as const }
      ]
    });

    vi.mocked(listFilesModule.listFilesWithJobStatus).mockImplementation(() => {
      pollCount++;
      if (pollCount === 1) {
        return Promise.resolve({
          files: [
            {
              id: 'file-1',
              name: 'contract.pdf',
              created_at: '2025-01-17T10:00:00Z',
              uploaded_by: 'user-1',
              extraction_mode: 'acroform',
              job: { status: 'queued' }
            },
            {
              id: 'file-2',
              name: 'addendum.pdf',
              created_at: '2025-01-17T10:01:00Z',
              uploaded_by: 'user-1',
              extraction_mode: 'ocr',
              job: { status: 'queued' }
            }
          ]
        });
      } else if (pollCount === 2) {
        return Promise.resolve({
          files: [
            {
              id: 'file-1',
              name: 'contract.pdf',
              created_at: '2025-01-17T10:00:00Z',
              uploaded_by: 'user-1',
              extraction_mode: 'acroform',
              job: { status: 'processing' }
            },
            {
              id: 'file-2',
              name: 'addendum.pdf',
              created_at: '2025-01-17T10:01:00Z',
              uploaded_by: 'user-1',
              extraction_mode: 'ocr',
              job: { status: 'processing' }
            }
          ]
        });
      } else {
        return Promise.resolve({
          files: [
            {
              id: 'file-1',
              name: 'contract.pdf',
              created_at: '2025-01-17T10:00:00Z',
              uploaded_by: 'user-1',
              extraction_mode: 'acroform',
              job: { status: 'done' }
            },
            {
              id: 'file-2',
              name: 'addendum.pdf',
              created_at: '2025-01-17T10:01:00Z',
              uploaded_by: 'user-1',
              extraction_mode: 'ocr',
              job: { status: 'done' }
            }
          ]
        });
      }
    });

    vi.mocked(signedUrlModule.getSignedUrl).mockResolvedValue({
      url: 'https://signed.example/test.pdf',
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show file progress after drag and drop', async () => {
    vi.useFakeTimers();
    
    render(<FilesTab txId={mockTxId} />);

    // Create mock files
    const file1 = new File(['content'], 'contract.pdf', { type: 'application/pdf' });
    const file2 = new File(['content'], 'addendum.pdf', { type: 'application/pdf' });

    // Find dropzone and simulate drop
    const dropzone = screen.getByTestId('upload-dropzone');
    
    await act(async () => {
      fireEvent.drop(dropzone, { 
        dataTransfer: {
          files: [file1, file2],
          items: [
            { kind: 'file', type: 'application/pdf', getAsFile: () => file1 },
            { kind: 'file', type: 'application/pdf', getAsFile: () => file2 }
          ],
          types: ['Files']
        }
      });
    });

    // Wait for upload to complete and files to appear
    await waitFor(() => {
      expect(screen.getByText('contract.pdf')).toBeInTheDocument();
      expect(screen.getByText('addendum.pdf')).toBeInTheDocument();
    });

    // Check initial status (queued)
    expect(screen.getAllByText('Queued')).toHaveLength(2);

    // Advance timer to trigger polling (will update to processing)
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });

    // Check processing status with spinner
    await waitFor(() => {
      const processingBadges = screen.getAllByText('Processing');
      expect(processingBadges).toHaveLength(2);
    });

    // Advance timer again (will update to done)
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });

    // Check done status
    await waitFor(() => {
      expect(screen.getAllByText('Done')).toHaveLength(2);
    });

    vi.useRealTimers();
  }, 10000);

  it('should open PDF in new tab when View button is clicked', async () => {
    render(<FilesTab txId={mockTxId} initialFiles={[
      {
        id: 'file-1',
        name: 'contract.pdf',
        created_at: '2025-01-17T10:00:00Z',
        uploaded_by: 'user-1',
        extraction_mode: 'acroform',
        path: 'files/contract.pdf',
        job: { status: 'done' }
      }
    ]} />);

    const viewButton = await screen.findByRole('button', { name: /view/i });
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalledWith('https://signed.example/test.pdf', '_blank');
    });
  });

  it('should show OCR alert banner for files with extraction_mode=ocr', async () => {
    render(<FilesTab txId={mockTxId} initialFiles={[
      {
        id: 'file-1',
        name: 'scanned.pdf',
        created_at: '2025-01-17T10:00:00Z',
        uploaded_by: 'user-1',
        extraction_mode: 'ocr',
        path: 'files/scanned.pdf',
        job: { status: 'done' }
      }
    ]} />);

    // Check for OCR alert banner
    await waitFor(() => {
      expect(screen.getByText(/scanned mode/i)).toBeInTheDocument();
      expect(screen.getByText(/OCR extraction/i)).toBeInTheDocument();
    });
  });

  it('should validate file type and size', async () => {
    const user = userEvent.setup();
    render(<FilesTab txId={mockTxId} />);

    // Try to upload non-PDF file
    const invalidFile = new File(['content'], 'document.txt', { type: 'text/plain' });
    
    const dropzone = screen.getByTestId('upload-dropzone');
    
    // Drop invalid file type - the validation happens in the dropzone
    await act(async () => {
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [invalidFile],
          items: [{ kind: 'file', type: 'text/plain', getAsFile: () => invalidFile }],
          types: ['Files']
        }
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Only PDF files are allowed/i)).toBeInTheDocument();
    });
  });

  it('should disable upload while files are uploading', async () => {
    // Make upload take time
    vi.mocked(uploadFilesModule.uploadFilesEnhanced).mockImplementation(() => new Promise(resolve => {
      setTimeout(() => resolve({
        files: [{ id: 'file-1', name: 'test.pdf', path: 'files/test.pdf', size: 1024 }]
      }), 100);
    }));

    render(<FilesTab txId={mockTxId} />);

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const dropzone = screen.getByTestId('upload-dropzone');

    await act(async () => {
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
          items: [{ kind: 'file', type: 'application/pdf', getAsFile: () => file }],
          types: ['Files']
        }
      });
    });

    // Dropzone should be disabled during upload
    await waitFor(() => {
      expect(dropzone).toHaveAttribute('data-disabled', 'true');
    });

    // Wait for upload to complete
    await waitFor(() => {
      expect(dropzone).toHaveAttribute('data-disabled', 'false');
    });
  });

  it('should show empty state when no files exist', () => {
    render(<FilesTab txId={mockTxId} />);

    expect(screen.getByText(/no files uploaded yet/i)).toBeInTheDocument();
    // Use getAllByText since there are multiple instances of this text
    const dragDropTexts = screen.getAllByText(/drag and drop PDF files/i);
    expect(dragDropTexts.length).toBeGreaterThan(0);
  });

  it('should handle upload errors gracefully', async () => {
    vi.mocked(uploadFilesModule.uploadFilesEnhanced).mockRejectedValueOnce(new Error('Upload failed'));

    render(<FilesTab txId={mockTxId} />);

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const dropzone = screen.getByTestId('upload-dropzone');

    await act(async () => {
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
          items: [{ kind: 'file', type: 'application/pdf', getAsFile: () => file }],
          types: ['Files']
        }
      });
    });

    // Check that error toast was called
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Upload failed',
          variant: 'destructive'
        })
      );
    });
  });

  it('should stop polling after max attempts', async () => {
    vi.useFakeTimers();
    
    // Always return processing status
    vi.mocked(listFilesModule.listFilesWithJobStatus).mockResolvedValue({
      files: [{
        id: 'file-1',
        name: 'test.pdf',
        created_at: '2025-01-17T10:00:00Z',
        uploaded_by: 'user-1',
        extraction_mode: 'acroform',
        path: 'files/test.pdf',
        job: { status: 'processing' }
      }]
    });

    render(<FilesTab txId={mockTxId} initialFiles={[{
      id: 'file-1',
      name: 'test.pdf',
      created_at: '2025-01-17T10:00:00Z',
      uploaded_by: 'user-1',
      extraction_mode: 'acroform',
      path: 'files/test.pdf',
      job: { status: 'processing' }
    }]} />);

    // Advance time to trigger all polls (30 polls * 3 seconds = 90 seconds)
    for (let i = 0; i < 30; i++) {
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
    }

    // Should have called listFilesWithJobStatus 30 times (max polls)
    await waitFor(() => {
      expect(listFilesModule.listFilesWithJobStatus).toHaveBeenCalledTimes(30);
    }, { timeout: 10000 });

    // Advance time more - should not poll anymore
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    expect(listFilesModule.listFilesWithJobStatus).toHaveBeenCalledTimes(30);
  }, 10000);
});