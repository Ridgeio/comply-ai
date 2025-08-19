import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { IssuesTable } from '../IssuesTable';
import { ReportSummary } from '../ReportSummary';
import { SpecialProvisionsCard } from '../SpecialProvisionsCard';

import type { ComplianceIssue } from '@/src/app/transactions/[txId]/actions/reportActions';

// Mock toast hook
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

// Mock server action
vi.mock('@/src/app/transactions/[txId]/actions/reportActions', () => ({
  generateReport: vi.fn()
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn()
  }
});

// Mock download functionality
global.URL.createObjectURL = vi.fn(() => 'blob:test');
global.URL.revokeObjectURL = vi.fn();

describe('Report UI Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  const mockReport = {
    id: 'report-123',
    tx_id: 'tx-123',
    form_type: 'TREC-20',
    form_version: '20-17',
    created_at: '2025-01-17T10:00:00Z',
    updated_at: '2025-01-17T10:00:00Z'
  };

  const mockIssues: ComplianceIssue[] = [
    {
      id: 'issue-1',
      report_id: 'report-123',
      severity: 'critical' as const,
      code: 'trec20.outdated_version',
      message: 'Form version 20-17 is outdated. Current version is 20-18.',
      cite: 'TREC Form 20-18',
      details_json: {
        expected: '20-18',
        actual: '20-17'
      }
    },
    {
      id: 'issue-2',
      report_id: 'report-123',
      severity: 'high' as const,
      code: 'trec20.special_provisions.ai_review',
      message: 'Special provisions require broker review',
      cite: 'Paragraph 11',
      details_json: {
        summary: 'The special provisions contain unusual terms that may impact the transaction timeline and buyer obligations.',
        reasons: [
          'Automatic extension clause detected',
          'Seller retains possession for 30 days after closing',
          'Non-standard earnest money terms'
        ],
        hints: ['automatic extension', 'possession after closing', 'earnest money']
      }
    },
    {
      id: 'issue-3',
      report_id: 'report-123',
      severity: 'low' as const,
      code: 'trec20.closing_date.weekend',
      message: 'Closing date falls on a weekend',
      cite: 'Paragraph 9',
      details_json: {
        date: '2025-03-15',
        day: 'Saturday'
      }
    }
  ];

  describe('ReportSummary', () => {
    it('should display severity counts', () => {
      render(<ReportSummary report={mockReport} issues={mockIssues} />);
      
      expect(screen.getByText('1 Critical')).toBeInTheDocument();
      expect(screen.getByText('1 High')).toBeInTheDocument();
      expect(screen.getByText('0 Medium')).toBeInTheDocument();
      expect(screen.getByText('1 Low')).toBeInTheDocument();
    });

    it('should display last generated timestamp', () => {
      render(<ReportSummary report={mockReport} issues={mockIssues} />);
      
      expect(screen.getByText(/Last generated:/)).toBeInTheDocument();
      expect(screen.getByText(/Jan 17, 2025/)).toBeInTheDocument();
    });

    it('should have regenerate button', () => {
      render(<ReportSummary report={mockReport} issues={mockIssues} txId="tx-123" />);
      
      const regenerateBtn = screen.getByRole('button', { name: /regenerate/i });
      expect(regenerateBtn).toBeInTheDocument();
      expect(regenerateBtn).not.toBeDisabled();
    });
  });

  describe('SpecialProvisionsCard', () => {
    const aiIssue = mockIssues[1]; // The AI review issue

    it('should render special provisions card when AI issue exists', () => {
      render(<SpecialProvisionsCard issue={aiIssue} />);
      
      expect(screen.getByText('Paragraph 11 — Special Provisions')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument(); // Badge
    });

    it('should display AI summary', () => {
      render(<SpecialProvisionsCard issue={aiIssue} />);
      
      expect(screen.getByText(/unusual terms that may impact/)).toBeInTheDocument();
    });

    it('should display reasons as bullet points', () => {
      render(<SpecialProvisionsCard issue={aiIssue} />);
      
      expect(screen.getByText('Automatic extension clause detected')).toBeInTheDocument();
      expect(screen.getByText('Seller retains possession for 30 days after closing')).toBeInTheDocument();
      expect(screen.getByText('Non-standard earnest money terms')).toBeInTheDocument();
    });

    it('should display pattern matches as badges', () => {
      render(<SpecialProvisionsCard issue={aiIssue} />);
      
      expect(screen.getByText('automatic extension')).toBeInTheDocument();
      expect(screen.getByText('possession after closing')).toBeInTheDocument();
      expect(screen.getByText('earnest money')).toBeInTheDocument();
    });
  });

  describe('IssuesTable', () => {
    it('should render all issues by default', () => {
      render(<IssuesTable issues={mockIssues} />);
      
      expect(screen.getByText(/Form version 20-17 is outdated/)).toBeInTheDocument();
      expect(screen.getByText(/Special provisions require broker review/)).toBeInTheDocument();
      expect(screen.getByText(/Closing date falls on a weekend/)).toBeInTheDocument();
    });

    it('should filter by severity when chip clicked', () => {
      render(<IssuesTable issues={mockIssues} />);
      
      // Initially all should be selected, so click to deselect critical and low
      const criticalChip = screen.getByRole('button', { name: /critical \(1\)/i });
      const lowChip = screen.getByRole('button', { name: /low \(1\)/i });
      
      fireEvent.click(criticalChip); // Deselect critical
      fireEvent.click(lowChip); // Deselect low
      
      // Only high severity issue should be visible
      expect(screen.getByText(/Special provisions require broker review/)).toBeInTheDocument();
      expect(screen.queryByText(/Form version 20-17 is outdated/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Closing date falls on a weekend/)).not.toBeInTheDocument();
    });

    it('should filter by category', () => {
      render(<IssuesTable issues={mockIssues} />);
      
      // Click Contract 20-18 category filter (all issues are TREC-20 based)
      const contractChip = screen.getByRole('button', { name: /Contract 20-18/i });
      fireEvent.click(contractChip);
      
      // All issues should still be visible since they're all TREC-20
      expect(screen.getByText(/Special provisions require broker review/)).toBeInTheDocument();
      expect(screen.getByText(/Form version 20-17 is outdated/)).toBeInTheDocument();
      expect(screen.getByText(/Closing date falls on a weekend/)).toBeInTheDocument();
    });

    it('should search by message text', () => {
      render(<IssuesTable issues={mockIssues} />);
      
      const searchInput = screen.getByPlaceholderText(/search issues by message/i);
      fireEvent.change(searchInput, { target: { value: 'weekend' } });
      
      // Only weekend issue should be visible
      expect(screen.getByText(/Closing date falls on a weekend/)).toBeInTheDocument();
      expect(screen.queryByText(/Form version 20-17 is outdated/)).not.toBeInTheDocument();
    });

    it('should expand row to show details_json', async () => {
      render(<IssuesTable issues={mockIssues} />);
      
      // Find and click expand button for first issue
      const expandButtons = screen.getAllByRole('button', { name: /expand/i });
      fireEvent.click(expandButtons[0]);
      
      // Details should be visible
      await waitFor(() => {
        expect(screen.getByText('expected:')).toBeInTheDocument();
        expect(screen.getByText('20-18')).toBeInTheDocument();
        expect(screen.getByText('actual:')).toBeInTheDocument();
        expect(screen.getByText('20-17')).toBeInTheDocument();
      });
    });

    it('should copy issue JSON to clipboard', async () => {
      render(<IssuesTable issues={mockIssues} />);
      
      // Find and click copy button for first issue
      const copyButtons = screen.getAllByRole('button', { name: /copy/i });
      fireEvent.click(copyButtons[0]);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('trec20.outdated_version')
        );
      });
      
      // Should show success toast notification
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Copied to clipboard'
          })
        );
      });
    });

    it('should trigger JSON download when export button clicked', async () => {
      const mockClick = vi.fn();
      const createElementSpy = vi.spyOn(document, 'createElement');
      
      render(<IssuesTable issues={mockIssues} report={mockReport} />);
      
      const downloadBtn = screen.getByRole('button', { name: /download json/i });
      fireEvent.click(downloadBtn);
      
      await waitFor(() => {
        // Check that a download link was created
        expect(createElementSpy).toHaveBeenCalledWith('a');
      });
    });

    it('should show proper severity badges', () => {
      render(<IssuesTable issues={mockIssues} />);
      
      // Check that severity badges are present
      expect(screen.getByText('critical')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('low')).toBeInTheDocument();
    });

    it('should handle multi-select filters', () => {
      render(<IssuesTable issues={mockIssues} />);
      
      // Initially all are selected, deselect high to keep only critical and low
      const highChip = screen.getByRole('button', { name: /high \(1\)/i });
      
      fireEvent.click(highChip); // Deselect high
      
      // Should show both critical and low issues
      expect(screen.getByText(/Form version 20-17 is outdated/)).toBeInTheDocument();
      expect(screen.getByText(/Closing date falls on a weekend/)).toBeInTheDocument();
      // High severity should be hidden
      expect(screen.queryByText(/Special provisions require broker review/)).not.toBeInTheDocument();
    });
  });
});