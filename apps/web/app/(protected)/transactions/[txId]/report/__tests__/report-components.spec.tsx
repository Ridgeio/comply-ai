import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportSummary } from '../ReportSummary'
import { IssuesTable } from '../IssuesTable'
import type { ComplianceIssue } from '@/src/app/transactions/[txId]/actions/reportActions'

describe('Report Components', () => {
  describe('ReportSummary', () => {
    it('should render severity counts correctly', () => {
      const counts = {
        critical: 2,
        high: 3,
        medium: 1,
        low: 4,
        info: 0
      }

      render(<ReportSummary countsBySeverity={counts} />)

      // Check critical count and label
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('Critical')).toBeInTheDocument()

      // Check high count and label
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('High')).toBeInTheDocument()

      // Check medium count and label
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('Medium')).toBeInTheDocument()

      // Check low count and label
      expect(screen.getByText('4')).toBeInTheDocument()
      expect(screen.getByText('Low')).toBeInTheDocument()

      // Info should show 0
      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText('Info')).toBeInTheDocument()
    })

    it('should render zeros for empty counts', () => {
      const counts = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
      }

      render(<ReportSummary countsBySeverity={counts} />)

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
      const criticalBadge = criticalBadges.find(el => el.closest('.bg-red-100'))
      
      const highBadges = screen.getAllByText('high')
      const highBadge = highBadges.find(el => el.closest('.bg-orange-100'))
      
      const lowBadges = screen.getAllByText('low')
      const lowBadge = lowBadges.find(el => el.closest('.bg-blue-100'))

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