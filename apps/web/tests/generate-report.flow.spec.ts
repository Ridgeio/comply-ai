import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// Mock server actions
vi.mock('@/src/app/transactions/[txId]/actions/reportActions', () => ({
  generateReport: vi.fn(),
  getLatestReportWithIssues: vi.fn()
}))

// Mock file actions  
const mockListFilesWithJobStatus = vi.fn()
vi.mock('@/src/app/transactions/[txId]/actions/fileActions', () => ({
  listFilesWithJobStatus: vi.fn(() => mockListFilesWithJobStatus()),
  uploadFiles: vi.fn(),
  getSignedUrl: vi.fn()
}))

// Mock Next.js router
const mockPush = vi.fn()
const mockRouter = {
  push: mockPush,
  refresh: vi.fn()
}
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ txId: 'tx-123' })
}))

import { FilesTab } from '../app/(protected)/transactions/[txId]/FilesTab'
import { ReportTab } from '../app/(protected)/transactions/[txId]/ReportTab'
import * as reportActions from '@/src/app/transactions/[txId]/actions/reportActions'

const mockGenerateReport = reportActions.generateReport as ReturnType<typeof vi.fn>
const mockGetLatestReportWithIssues = reportActions.getLatestReportWithIssues as ReturnType<typeof vi.fn>

describe('Generate Report Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate report from Files tab and navigate to Report tab', async () => {
    const user = userEvent.setup()
    
    // Mock file list with completed job
    mockListFilesWithJobStatus.mockResolvedValue([{
      id: 'file-1',
      path: 'transactions/org-123/tx-123/2025/01/15/contract.pdf',
      name: 'contract.pdf',
      uploaded_by: 'user-123',
      created_at: '2025-01-15T10:00:00Z',
      job_status: 'completed',
      job_id: 'job-1'
    }])

    // Mock generate report response
    mockGenerateReport.mockResolvedValue({
      reportId: 'report-123',
      countsBySeverity: {
        critical: 1,
        high: 1,
        medium: 0,
        low: 1,
        info: 0
      }
    })


    // Render Files tab
    render(React.createElement(FilesTab, { txId: "tx-123" }))

    // Wait for files to load
    await waitFor(() => {
      expect(screen.getByText('contract.pdf')).toBeInTheDocument()
    })

    // Click Generate Report button
    const generateButton = screen.getByRole('button', { name: /Generate Report/i })
    await user.click(generateButton)

    // Verify generateReport was called
    await waitFor(() => {
      expect(mockGenerateReport).toHaveBeenCalledWith({
        txId: 'tx-123',
        primaryFileId: 'file-1'
      })
    })

    // Verify navigation to Report tab
    expect(mockPush).toHaveBeenCalledWith('/transactions/tx-123?tab=report')
  })

  it('should show report with issues on Report tab', async () => {
    // Mock report data
    mockGetLatestReportWithIssues.mockResolvedValue({
      report: {
        id: 'report-123',
        tx_id: 'tx-123',
        created_at: '2025-01-15T12:00:00Z',
        metadata: {
          fileId: 'file-1',
          fileName: 'contract.pdf'
        }
      },
      issues: [
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
          severity: 'low',
          code: 'WEEKEND_CLOSING',
          message: 'Closing date falls on a weekend',
          cite: null
        }
      ],
      countsBySeverity: {
        critical: 1,
        high: 1,
        medium: 0,
        low: 1,
        info: 0
      }
    })

    // Render Report tab
    render(React.createElement(ReportTab, { txId: "tx-123" }))

    // Wait for report to load
    await waitFor(() => {
      expect(screen.getByText('Compliance Report')).toBeInTheDocument()
    })

    // Check summary shows severity labels
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Low')).toBeInTheDocument()
    
    // Check that the counts are displayed (there will be multiple "1"s, so we check by getAllByText)
    const ones = screen.getAllByText('1')
    expect(ones.length).toBeGreaterThan(0)

    // Check issues are displayed
    expect(screen.getByText('At least one buyer name is required')).toBeInTheDocument()
    expect(screen.getByText('Form version is outdated')).toBeInTheDocument()
    expect(screen.getByText('Closing date falls on a weekend')).toBeInTheDocument()
  })

  it('should show empty state when no report exists', async () => {
    mockGetLatestReportWithIssues.mockResolvedValue(null)

    render(React.createElement(ReportTab, { txId: "tx-123" }))

    await waitFor(() => {
      expect(screen.getByText(/No report generated yet/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Generate Report/i })).toBeInTheDocument()
    })
  })
})