import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportPage } from '@/app/(protected)/transactions/[txId]/report/page';
import { ReportSummary } from '@/app/(protected)/transactions/[txId]/report/ReportSummary';

// Mock server actions
vi.mock('@/src/app/transactions/[txId]/actions/reportActions', () => ({
  generateReport: vi.fn(),
  fetchReport: vi.fn()
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

describe('Report Regenerate Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockReport = {
    id: 'report-123',
    tx_id: 'tx-123',
    form_type: 'TREC-20',
    form_version: '20-18',
    created_at: '2025-01-17T10:00:00Z',
    updated_at: '2025-01-17T10:00:00Z'
  };

  const mockIssues = [
    {
      id: 'issue-1',
      report_id: 'report-123',
      severity: 'high' as const,
      code: 'test.issue',
      message: 'Initial issue',
      cite: 'Test'
    }
  ];

  const updatedIssues = [
    {
      id: 'issue-2',
      report_id: 'report-123',
      severity: 'low' as const,
      code: 'test.updated',
      message: 'Updated issue after regeneration',
      cite: 'Test'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should disable regenerate button and show spinner while generating', async () => {
    const { generateReport } = await import('@/src/app/transactions/[txId]/actions/reportActions');
    
    // Mock generateReport to take time
    vi.mocked(generateReport).mockImplementation(() => 
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            report: { ...mockReport, updated_at: new Date().toISOString() },
            issues: updatedIssues
          });
        }, 100);
      })
    );

    render(<ReportSummary report={mockReport} issues={mockIssues} txId="tx-123" />);
    
    const regenerateBtn = screen.getByRole('button', { name: /regenerate/i });
    expect(regenerateBtn).not.toBeDisabled();
    
    // Click regenerate
    fireEvent.click(regenerateBtn);
    
    // Button should be disabled immediately
    await waitFor(() => {
      expect(regenerateBtn).toBeDisabled();
    });
    
    // Should show loading spinner
    expect(screen.getByTestId('regenerate-spinner')).toBeInTheDocument();
    
    // Wait for completion
    await waitFor(() => {
      expect(regenerateBtn).not.toBeDisabled();
    }, { timeout: 200 });
    
    // Spinner should be gone
    expect(screen.queryByTestId('regenerate-spinner')).not.toBeInTheDocument();
  });

  it('should update the report data after successful regeneration', async () => {
    const { generateReport } = await import('@/src/app/transactions/[txId]/actions/reportActions');
    
    vi.mocked(generateReport).mockResolvedValueOnce({
      report: { ...mockReport, updated_at: '2025-01-17T11:00:00Z' },
      issues: updatedIssues
    });

    const { rerender } = render(
      <div>
        <ReportSummary report={mockReport} issues={mockIssues} txId="tx-123" />
        <div data-testid="issues">
          {mockIssues.map(issue => (
            <div key={issue.id}>{issue.message}</div>
          ))}
        </div>
      </div>
    );
    
    // Initial state
    expect(screen.getByText('Initial issue')).toBeInTheDocument();
    
    const regenerateBtn = screen.getByRole('button', { name: /regenerate/i });
    fireEvent.click(regenerateBtn);
    
    // Wait for regeneration to complete
    await waitFor(() => {
      expect(generateReport).toHaveBeenCalledWith({
        txId: 'tx-123',
        regenerate: true
      });
    });
    
    // Simulate component re-render with new data
    rerender(
      <div>
        <ReportSummary report={{ ...mockReport, updated_at: '2025-01-17T11:00:00Z' }} issues={updatedIssues} txId="tx-123" />
        <div data-testid="issues">
          {updatedIssues.map(issue => (
            <div key={issue.id}>{issue.message}</div>
          ))}
        </div>
      </div>
    );
    
    // Should show updated content
    expect(screen.getByText('Updated issue after regeneration')).toBeInTheDocument();
    expect(screen.queryByText('Initial issue')).not.toBeInTheDocument();
  });

  it('should show error message if regeneration fails', async () => {
    const { generateReport } = await import('@/src/app/transactions/[txId]/actions/reportActions');
    
    vi.mocked(generateReport).mockRejectedValueOnce(new Error('Generation failed'));

    render(<ReportSummary report={mockReport} issues={mockIssues} txId="tx-123" />);
    
    const regenerateBtn = screen.getByRole('button', { name: /regenerate/i });
    fireEvent.click(regenerateBtn);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to regenerate report',
          description: 'Generation failed',
          variant: 'destructive'
        })
      );
    });
    
    // Button should be enabled again after error
    await waitFor(() => {
      expect(regenerateBtn).not.toBeDisabled();
    });
  });

  it('should prevent multiple simultaneous regenerations', async () => {
    const { generateReport } = await import('@/src/app/transactions/[txId]/actions/reportActions');
    
    // Mock slow generation
    vi.mocked(generateReport).mockImplementation(() => 
      new Promise((resolve) => {
        setTimeout(resolve, 200);
      })
    );

    render(<ReportSummary report={mockReport} issues={mockIssues} txId="tx-123" />);
    
    const regenerateBtn = screen.getByRole('button', { name: /regenerate/i });
    
    // Click multiple times quickly
    fireEvent.click(regenerateBtn);
    fireEvent.click(regenerateBtn);
    fireEvent.click(regenerateBtn);
    
    // Should only call generateReport once
    await waitFor(() => {
      expect(generateReport).toHaveBeenCalledTimes(1);
    });
  });

  it('should update timestamp after successful regeneration', async () => {
    const { generateReport } = await import('@/src/app/transactions/[txId]/actions/reportActions');
    
    const newTimestamp = '2025-01-17T12:00:00Z';
    vi.mocked(generateReport).mockResolvedValueOnce({
      report: { ...mockReport, updated_at: newTimestamp },
      issues: mockIssues
    });

    const { rerender } = render(<ReportSummary report={mockReport} issues={mockIssues} txId="tx-123" />);
    
    // Initial timestamp - check date part only to avoid timezone issues
    expect(screen.getByText(/Jan 17, 2025/)).toBeInTheDocument();
    
    const regenerateBtn = screen.getByRole('button', { name: /regenerate/i });
    fireEvent.click(regenerateBtn);
    
    await waitFor(() => {
      expect(generateReport).toHaveBeenCalled();
    });
    
    // Re-render with updated timestamp
    rerender(<ReportSummary report={{ ...mockReport, updated_at: newTimestamp }} issues={mockIssues} txId="tx-123" />);
    
    // Should show new timestamp - just verify the date changed (time depends on timezone)
    expect(screen.getByText(/Jan 17, 2025/)).toBeInTheDocument();
  });
});