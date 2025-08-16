'use server'

import { getAuthenticatedContext } from '@/src/lib/auth-helpers'
import { requireCurrentOrg } from '@/src/lib/org'
import { z } from 'zod'

// Types
export interface ComplianceIssue {
  id: string
  report_id: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  code: string
  message: string
  cite: string | null
}

export interface Report {
  id: string
  tx_id: string
  created_at: string
  metadata: {
    fileId: string
    fileName: string
  }
}

export interface ReportWithIssues {
  report: Report
  issues: ComplianceIssue[]
  countsBySeverity: Record<ComplianceIssue['severity'], number>
}

// Input validation
const generateReportSchema = z.object({
  txId: z.string().uuid(),
  primaryFileId: z.string()
})

// Helper to generate dev stub issues
function generateDevStubIssues(reportId: string): ComplianceIssue[] {
  return [
    {
      id: `issue-${Math.random().toString(36).substr(2, 9)}`,
      report_id: reportId,
      severity: 'critical',
      code: 'MISSING_BUYER',
      message: 'At least one buyer name is required',
      cite: 'TREC 20-18 ¶1'
    },
    {
      id: `issue-${Math.random().toString(36).substr(2, 9)}`,
      report_id: reportId,
      severity: 'high',
      code: 'OUTDATED_VERSION',
      message: 'Form version is outdated (using 2021 version, current is 2024)',
      cite: 'TREC Updates'
    },
    {
      id: `issue-${Math.random().toString(36).substr(2, 9)}`,
      report_id: reportId,
      severity: 'high',
      code: 'MISSING_PROPERTY_ADDRESS',
      message: 'Property address is incomplete',
      cite: 'TREC 20-18 ¶2'
    },
    {
      id: `issue-${Math.random().toString(36).substr(2, 9)}`,
      report_id: reportId,
      severity: 'medium',
      code: 'MISSING_OPTION_FEE',
      message: 'Option fee amount not specified',
      cite: 'TREC 20-18 ¶23'
    },
    {
      id: `issue-${Math.random().toString(36).substr(2, 9)}`,
      report_id: reportId,
      severity: 'low',
      code: 'WEEKEND_CLOSING',
      message: 'Closing date falls on a weekend (2025-03-15)',
      cite: null
    },
    {
      id: `issue-${Math.random().toString(36).substr(2, 9)}`,
      report_id: reportId,
      severity: 'low',
      code: 'MISSING_HOA_INFO',
      message: 'HOA information section not completed',
      cite: 'TREC 20-18 ¶6.C'
    },
    {
      id: `issue-${Math.random().toString(36).substr(2, 9)}`,
      report_id: reportId,
      severity: 'info',
      code: 'SPECIAL_PROVISIONS',
      message: 'Special provisions section contains non-standard language',
      cite: null
    }
  ]
}

export async function generateReport(input: z.infer<typeof generateReportSchema>) {
  try {
    const { txId, primaryFileId } = generateReportSchema.parse(input)
    
    const { user, adminClient: supabase } = await getAuthenticatedContext()
    const orgId = await requireCurrentOrg()

    // Verify transaction belongs to user's org
    const { data: transaction } = await supabase
      .from('transactions')
      .select('id, org_id')
      .eq('id', txId)
      .eq('org_id', orgId)
      .single()

    if (!transaction) {
      throw new Error('Transaction not found')
    }

    // Get file info
    const { data: file } = await supabase
      .from('transaction_files')
      .select('id, name')
      .eq('id', primaryFileId)
      .single()

    if (!file) {
      throw new Error('File not found')
    }

    // Create report
    const reportId = `report-${Math.random().toString(36).substr(2, 9)}`
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        id: reportId,
        tx_id: txId,
        metadata: {
          fileId: primaryFileId,
          fileName: file.name
        }
      })
      .select()
      .single()

    if (reportError) throw reportError

    // Generate dev stub issues
    const issues = generateDevStubIssues(reportId)
    
    // Insert issues
    const { error: issuesError } = await supabase
      .from('report_issues')
      .insert(issues)

    if (issuesError) throw issuesError

    // Calculate counts
    const countsBySeverity = issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1
      return acc
    }, {} as Record<ComplianceIssue['severity'], number>)

    // Ensure all severities have a count
    const allSeverities: ComplianceIssue['severity'][] = ['critical', 'high', 'medium', 'low', 'info']
    allSeverities.forEach(severity => {
      if (!countsBySeverity[severity]) {
        countsBySeverity[severity] = 0
      }
    })

    return {
      reportId: report.id,
      countsBySeverity
    }
  } catch (error) {
    console.error('Failed to generate report:', error)
    throw new Error('Failed to generate report')
  }
}

export async function getLatestReportWithIssues(txId: string): Promise<ReportWithIssues | null> {
  try {
    const { user, adminClient: supabase } = await getAuthenticatedContext()
    const orgId = await requireCurrentOrg()

    // Verify transaction belongs to user's org
    const { data: transaction } = await supabase
      .from('transactions')
      .select('id')
      .eq('id', txId)
      .eq('org_id', orgId)
      .single()

    if (!transaction) {
      return null
    }

    // Get latest report
    const { data: report } = await supabase
      .from('reports')
      .select('*')
      .eq('tx_id', txId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!report) {
      return null
    }

    // Get issues for the report
    const { data: issues } = await supabase
      .from('report_issues')
      .select('*')
      .eq('report_id', report.id)
      .order('severity', { ascending: true })

    const typedIssues = (issues || []) as ComplianceIssue[]

    // Calculate counts
    const countsBySeverity = typedIssues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1
      return acc
    }, {} as Record<ComplianceIssue['severity'], number>)

    // Ensure all severities have a count
    const allSeverities: ComplianceIssue['severity'][] = ['critical', 'high', 'medium', 'low', 'info']
    allSeverities.forEach(severity => {
      if (!countsBySeverity[severity]) {
        countsBySeverity[severity] = 0
      }
    })

    return {
      report: report as Report,
      issues: typedIssues,
      countsBySeverity
    }
  } catch (error) {
    console.error('Failed to get report:', error)
    return null
  }
}