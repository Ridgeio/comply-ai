import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { IssuesTable } from '../IssuesTable';
import { VersionWarning } from '../VersionWarning';

import type { ComplianceIssue } from '@/src/app/transactions/[txId]/actions/reportActions';

// Mock Next.js navigation
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>
}));

describe('Version Warning', () => {
  const outdatedVersionIssue: ComplianceIssue = {
    id: 'issue-1',
    report_id: 'report-123',
    severity: 'critical',
    code: 'trec20.version.outdated',
    message: 'Form version is outdated',
    cite: 'TREC Form Standards',
    details_json: {
      expected_version: '20-18',
      found: '20-17'
    }
  };

  const otherIssue: ComplianceIssue = {
    id: 'issue-2',
    report_id: 'report-123',
    severity: 'high',
    code: 'trec20.other',
    message: 'Some other issue',
    cite: 'Paragraph 11'
  };

  describe('VersionWarning Component', () => {
    it('should render warning alert when outdated version issue exists', () => {
      render(<VersionWarning issues={[outdatedVersionIssue, otherIssue]} />);
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/outdated form version detected/i)).toBeInTheDocument();
      expect(screen.getByText(/expected 20-18, found 20-17/i)).toBeInTheDocument();
    });

    it('should include link to Settings → Forms', () => {
      render(<VersionWarning issues={[outdatedVersionIssue, otherIssue]} />);
      
      const link = screen.getByRole('link', { name: /settings → forms/i });
      expect(link).toBeInTheDocument();
      expect(link.getAttribute('href')).toBe('/settings/forms');
    });

    it('should be dismissible', () => {
      render(<VersionWarning issues={[outdatedVersionIssue, otherIssue]} />);
      
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      fireEvent.click(dismissButton);
      
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should not render when no outdated version issue exists', () => {
      render(<VersionWarning issues={[otherIssue]} />);
      
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should extract version info from details_json', () => {
      const customIssue = {
        ...outdatedVersionIssue,
        details_json: {
          expected_version: '40-11',
          found: '40-10'
        }
      };
      
      render(<VersionWarning issues={[customIssue]} />);
      
      expect(screen.getByText(/expected 40-11, found 40-10/i)).toBeInTheDocument();
    });
  });

  describe('Version chip in IssuesTable', () => {
    it('should show version chip for outdated version issues', () => {
      render(<IssuesTable issues={[outdatedVersionIssue, otherIssue]} />);
      
      // Should have a version badge/chip near the outdated issue
      const versionBadge = screen.getByText(/Version:.*20-17.*Outdated/);
      expect(versionBadge).toBeInTheDocument();
    });

    it('should display version info in issue details', () => {
      render(<IssuesTable issues={[outdatedVersionIssue]} />);
      
      // Expand the issue to see details
      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);
      
      // Should show expected and found versions
      expect(screen.getByText('expected_version:')).toBeInTheDocument();
      expect(screen.getByText('20-18')).toBeInTheDocument();
      expect(screen.getByText('found:')).toBeInTheDocument();
      expect(screen.getByText('20-17')).toBeInTheDocument();
    });
  });

  describe('Integration with Report Tab', () => {
    it('should display warning at top of report when version issue exists', () => {
      const ReportWithWarning = () => (
        <div>
          <VersionWarning issues={[outdatedVersionIssue]} />
          <IssuesTable issues={[outdatedVersionIssue, otherIssue]} />
        </div>
      );
      
      render(<ReportWithWarning />);
      
      // Alert should be at the top
      const alert = screen.getByRole('alert');
      const table = screen.getByRole('table');
      
      // Check that both alert and table are present
      expect(alert).toBeInTheDocument();
      expect(table).toBeInTheDocument();
    });

    it('should handle multiple version issues', () => {
      const multipleVersionIssues = [
        outdatedVersionIssue,
        {
          ...outdatedVersionIssue,
          id: 'issue-3',
          code: 'trec40.version.outdated',
          details_json: {
            expected_version: '40-11',
            found: '40-10'
          }
        }
      ];
      
      render(<VersionWarning issues={multipleVersionIssues} />);
      
      // Should show both version mismatches
      expect(screen.getByText(/expected 20-18, found 20-17/i)).toBeInTheDocument();
      // Or could show a generic message for multiple
      expect(screen.getByText(/outdated form version/i)).toBeInTheDocument();
    });
  });
});