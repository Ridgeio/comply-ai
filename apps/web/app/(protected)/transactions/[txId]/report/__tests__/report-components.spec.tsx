import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import { IssuesTable } from '../IssuesTable'
import { ReportSummary } from '../ReportSummary'

import type { ComplianceIssue } from '@/src/app/transactions/[txId]/actions/reportActions'

describe('Report Components', () => {
  describe('ReportSummary', () => {
    it('should render severity counts correctly', () => {
      const mockReport = {
        id: 'report-1',
        tx_id: 'tx-1',
        created_at: '2025-01-17T10:00:00Z',
        updated_at: '2025-01-17T10:00:00Z'
      };
      
      const mockIssues = [
        { id: '1', severity: 'critical' as const, code: 'test', message: 'test' },
        { id: '2', severity: 'critical' as const, code: 'test', message: 'test' },
        { id: '3', severity: 'high' as const, code: 'test', message: 'test' },
        { id: '4', severity: 'high' as const, code: 'test', message: 'test' },
        { id: '5', severity: 'high' as const, code: 'test', message: 'test' },
        { id: '6', severity: 'medium' as const, code: 'test', message: 'test' },
        { id: '7', severity: 'low' as const, code: 'test', message: 'test' },
        { id: '8', severity: 'low' as const, code: 'test', message: 'test' },
        { id: '9', severity: 'low' as const, code: 'test', message: 'test' },
        { id: '10', severity: 'low' as const, code: 'test', message: 'test' }
      ];

      render(<ReportSummary report={mockReport} issues={mockIssues} />)

      // Check critical count and label
      const criticalElements = screen.getAllByText('2');
      expect(criticalElements.length).toBeGreaterThan(0);
      expect(screen.getByText('2 Critical')).toBeInTheDocument()

      // Check high count and label  
      const highElements = screen.getAllByText('3');
      expect(highElements.length).toBeGreaterThan(0);
      expect(screen.getByText('3 High')).toBeInTheDocument()

      // Check medium count and label
      const mediumElements = screen.getAllByText('1');
      expect(mediumElements.length).toBeGreaterThan(0);
      expect(screen.getByText('1 Medium')).toBeInTheDocument()

      // Check low count and label
      const lowElements = screen.getAllByText('4');
      expect(lowElements.length).toBeGreaterThan(0);
      expect(screen.getByText('4 Low')).toBeInTheDocument()

      // Info should show 0
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThan(0);
      expect(screen.getByText('0 Info')).toBeInTheDocument()
    })

    it('should render zeros for empty counts', () => {
      const mockReport = {
        id: 'report-1',
        tx_id: 'tx-1',
        created_at: '2025-01-17T10:00:00Z',
        updated_at: '2025-01-17T10:00:00Z'
      };

      render(<ReportSummary report={mockReport} issues={[]} />)

      // Should show 5 zeros (one for each severity)
      const zeros = screen.getAllByText('0')
      expect(zeros).toHaveLength(5)
    })
  })

  describe('IssuesTable', () => {
    const mockIssues: ComplianceIssue[] = [
      {
        id: 'issue-1',
        report_id: 'report-123',
        severity: 'critical',
        code: 'MISSING_BUYER',
        message: 'At least one buyer name is required',
        cite: 'TREC 20-18 ¶1'
      },
      {
        id: 'issue-2',
        report_id: 'report-123',
        severity: 'high',
        code: 'OUTDATED_VERSION',
        message: 'Form version is outdated',
        cite: 'TREC Updates'
      },
      {
        id: 'issue-3',
        report_id: 'report-123',
        severity: 'medium',
        code: 'MISSING_OPTION_FEE',
        message: 'Option fee amount not specified',
        cite: 'TREC 20-18 ¶23'
      },
      {
        id: 'issue-4',
        report_id: 'report-123',
        severity: 'low',
        code: 'WEEKEND_CLOSING',
        message: 'Closing date falls on a weekend',
        cite: null
      }
    ]

    it('should render all issues when no filter is applied', () => {
      render(<IssuesTable issues={mockIssues} />)

      expect(screen.getByText('At least one buyer name is required')).toBeInTheDocument()
      expect(screen.getByText('Form version is outdated')).toBeInTheDocument()
      expect(screen.getByText('Option fee amount not specified')).toBeInTheDocument()
      expect(screen.getByText('Closing date falls on a weekend')).toBeInTheDocument()
    })

    it('should filter issues by severity when filter buttons are clicked', async () => {
      const user = userEvent.setup()
      render(<IssuesTable issues={mockIssues} />)

      // Initially all issues are shown
      expect(screen.getByText('At least one buyer name is required')).toBeInTheDocument()
      expect(screen.getByText('Option fee amount not specified')).toBeInTheDocument()

      // Click to hide medium severity
      const mediumButton = screen.getByRole('button', { name: /medium/i })
      await user.click(mediumButton)

      // Medium severity issue should be hidden
      expect(screen.getByText('At least one buyer name is required')).toBeInTheDocument()
      expect(screen.queryByText('Option fee amount not specified')).not.toBeInTheDocument()

      // Click to hide critical severity
      const criticalButton = screen.getByRole('button', { name: /critical/i })
      await user.click(criticalButton)

      // Critical severity issue should be hidden
      expect(screen.queryByText('At least one buyer name is required')).not.toBeInTheDocument()
    })

    it('should trigger JSON download with correct blob', async () => {
      const user = userEvent.setup()
      
      // Mock URL.createObjectURL 
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url')
      const mockRevokeObjectURL = vi.fn()
      const mockClick = vi.fn()
      
      global.URL.createObjectURL = mockCreateObjectURL
      global.URL.revokeObjectURL = mockRevokeObjectURL

      // Mock document.createElement for anchor tag
      const originalCreateElement = document.createElement.bind(document)
      const mockCreateElement = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const element = originalCreateElement(tag)
        if (tag === 'a') {
          // Override click on anchor elements
          element.click = mockClick
        }
        return element
      })

      render(<IssuesTable issues={mockIssues} />)

      // Find and click download button
      const downloadButton = screen.getByRole('button', { name: /download json/i })
      await user.click(downloadButton)

      // Verify Blob was created with correct content
      expect(mockCreateObjectURL).toHaveBeenCalledWith(
        expect.objectContaining({
          size: expect.any(Number),
          type: 'application/json'
        })
      )

      // Verify download was triggered
      expect(mockClick).toHaveBeenCalled()
      
      // Clean up
      mockCreateElement.mockRestore()
    })

    it('should show empty state when no issues', () => {
      render(<IssuesTable issues={[]} />)
      
      expect(screen.getByText(/no compliance issues found/i)).toBeInTheDocument()
    })

    it('should display severity badges with correct styling', () => {
      render(<IssuesTable issues={mockIssues} />)

      // Find severity badges in table cells (Badge components)
      const criticalBadges = screen.getAllByText('critical')
      const criticalBadge = criticalBadges.find(el => el.closest('.bg-destructive'))
      
      const highBadges = screen.getAllByText('high')
      const highBadge = highBadges.find(el => el.closest('.bg-primary'))
      
      const lowBadges = screen.getAllByText('low')
      const lowBadge = lowBadges.find(el => el.closest('[class*="border"]'))

      // Verify badges exist with correct styling
      expect(criticalBadge).toBeTruthy()
      expect(highBadge).toBeTruthy()
      expect(lowBadge).toBeTruthy()
    })

    it('should display citation when available', () => {
      render(<IssuesTable issues={mockIssues} />)

      expect(screen.getByText('TREC 20-18 ¶1')).toBeInTheDocument()
      expect(screen.getByText('TREC Updates')).toBeInTheDocument()
      expect(screen.getByText('TREC 20-18 ¶23')).toBeInTheDocument()
    })
  })
})