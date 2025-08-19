import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { IssuesTable } from '../IssuesTable';
import { ReportSummary } from '../ReportSummary';
import { SpecialProvisionsCard } from '../SpecialProvisionsCard';

// Mock hooks
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}));

vi.mock('@/src/app/transactions/[txId]/actions/reportActions', () => ({
  generateReport: vi.fn()
}));

describe('Report Components', () => {
  const mockReport = {
    id: 'report-123',
    tx_id: 'tx-123',
    created_at: '2025-01-17T10:00:00Z',
    updated_at: '2025-01-17T10:00:00Z'
  };

  const mockIssues = [
    {
      id: 'issue-1',
      report_id: 'report-123',
      severity: 'critical' as const,
      code: 'trec20.outdated',
      message: 'Outdated form version',
      cite: 'TREC 20-18'
    },
    {
      id: 'issue-2',
      report_id: 'report-123',
      severity: 'high' as const,
      code: 'trec20.special_provisions.ai',
      message: 'Special provisions need review',
      cite: 'Paragraph 11',
      details_json: {
        summary: 'Complex terms detected',
        reasons: ['Reason 1', 'Reason 2'],
        hints: ['hint1', 'hint2'],
        classification: 'review'
      }
    }
  ];

  describe('ReportSummary', () => {
    it('should render severity counts', () => {
      render(<ReportSummary report={mockReport} issues={mockIssues} />);
      
      expect(screen.getByText('1 Critical')).toBeInTheDocument();
      expect(screen.getByText('1 High')).toBeInTheDocument();
      expect(screen.getByText('0 Medium')).toBeInTheDocument();
    });

    it('should show regenerate button when txId provided', () => {
      render(<ReportSummary report={mockReport} issues={mockIssues} txId="tx-123" />);
      
      expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
    });

    it('should not show regenerate button without txId', () => {
      render(<ReportSummary report={mockReport} issues={mockIssues} />);
      
      expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument();
    });
  });

  describe('SpecialProvisionsCard', () => {
    it('should render when AI issue provided', () => {
      const aiIssue = mockIssues[1];
      render(<SpecialProvisionsCard issue={aiIssue} />);
      
      expect(screen.getByText('Paragraph 11 — Special Provisions')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
      expect(screen.getByText('Complex terms detected')).toBeInTheDocument();
    });

    it('should not render for non-special-provisions issues', () => {
      const regularIssue = mockIssues[0];
      const { container } = render(<SpecialProvisionsCard issue={regularIssue} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should display reasons and hints', () => {
      const aiIssue = mockIssues[1];
      render(<SpecialProvisionsCard issue={aiIssue} />);
      
      expect(screen.getByText('Reason 1')).toBeInTheDocument();
      expect(screen.getByText('Reason 2')).toBeInTheDocument();
      expect(screen.getByText('hint1')).toBeInTheDocument();
      expect(screen.getByText('hint2')).toBeInTheDocument();
    });
  });

  describe('IssuesTable', () => {
    it('should render all issues', () => {
      render(<IssuesTable issues={mockIssues} />);
      
      expect(screen.getByText('Outdated form version')).toBeInTheDocument();
      expect(screen.getByText('Special provisions need review')).toBeInTheDocument();
    });

    it('should show severity badges', () => {
      render(<IssuesTable issues={mockIssues} />);
      
      expect(screen.getByText('critical')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
    });

    it('should have search input', () => {
      render(<IssuesTable issues={mockIssues} />);
      
      expect(screen.getByPlaceholderText(/search issues/i)).toBeInTheDocument();
    });

    it('should have download button', () => {
      render(<IssuesTable issues={mockIssues} report={mockReport} />);
      
      expect(screen.getByRole('button', { name: /download json/i })).toBeInTheDocument();
    });

    it('should show empty state when no issues', () => {
      render(<IssuesTable issues={[]} />);
      
      expect(screen.getByText('No compliance issues found')).toBeInTheDocument();
    });

    it('should have copy buttons for each issue', () => {
      render(<IssuesTable issues={mockIssues} />);
      
      const copyButtons = screen.getAllByRole('button', { name: /copy/i });
      expect(copyButtons).toHaveLength(2);
    });
  });
});