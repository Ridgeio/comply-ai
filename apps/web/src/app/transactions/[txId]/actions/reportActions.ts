'use server'

import { analyzeSpecialProvisions, buildRegistry } from '@repo/shared'
import { z } from 'zod'

import { createProvider } from '@/src/lib/ai/provider'
import { getAuthenticatedContext } from '@/src/lib/auth-helpers'
import { requireCurrentOrg } from '@/src/lib/org'

// Types
export interface ComplianceIssue {
  id: string
  report_id: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  code: string
  message: string
  cite: string | null
  details_json?: {
    summary?: string
    reasons?: string[]
    hints?: string[]
    ai_classification?: 'none' | 'caution' | 'review'
  }
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
async function generateDevStubIssues(
  reportId: string, 
  specialProvisionsText?: string,
  formVersion?: string
): Promise<ComplianceIssue[]> {
  // Load forms registry
  const { adminClient: supabase } = await getAuthenticatedContext();
  const { data: registryRows } = await supabase
    .from('forms_registry')
    .select('form_code, expected_version, effective_date');
  
  const registry = buildRegistry(registryRows || []);
  const expectedVersion = registry['TREC-20']?.expected_version || '20-18';
  
  const issues: ComplianceIssue[] = [
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
      message: formVersion && formVersion !== expectedVersion 
        ? `Form version is outdated (using ${formVersion}, expected ${expectedVersion})`
        : `Form version is outdated (expected ${expectedVersion})`,
      cite: 'TREC Updates',
      details_json: {
        summary: `The form version does not match the current expected version in the registry`,
        reasons: [`Found version: ${formVersion || 'unknown'}`, `Expected version: ${expectedVersion}`]
      }
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
  ];

  // Add AI analysis for special provisions if text is provided
  if (specialProvisionsText) {
    try {
      const provider = await createProvider();
      const aiResult = await analyzeSpecialProvisions(specialProvisionsText, provider);
      
      // Map AI classification to severity
      const severityMap = {
        'review': 'high' as const,
        'caution': 'low' as const,
        'none': 'info' as const
      };
      
      // Create AI-powered issue
      const aiIssue: ComplianceIssue = {
        id: `issue-${Math.random().toString(36).substr(2, 9)}`,
        report_id: reportId,
        severity: severityMap[aiResult.classification],
        code: `SPECIAL_PROVISIONS_AI_${aiResult.classification.toUpperCase()}`,
        message: `AI Analysis: Special provisions require ${aiResult.classification === 'review' ? 'careful review' : aiResult.classification === 'caution' ? 'attention' : 'no action'}`,
        cite: 'TREC 20-18 ¶11',
        details_json: {
          summary: aiResult.summary,
          reasons: aiResult.reasons,
          hints: aiResult.hints,
          ai_classification: aiResult.classification
        }
      };
      
      issues.push(aiIssue);
    } catch (error) {
      console.error('AI analysis failed:', error);
      // Continue without AI analysis if it fails
    }
  }

  return issues;
}

export async function generateReport(input: z.infer<typeof generateReportSchema>) {
  try {
    const { txId, primaryFileId } = generateReportSchema.parse(input)
    
    const { user: _user, adminClient: supabase } = await getAuthenticatedContext()
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

    // TODO: In production, this is where we would:
    // 1. Download the file from storage
    // 2. Parse it with toRawTrec20()
    // 3. Check the result.meta.mode to determine extraction mode
    // 4. Update transaction_files with the extraction_mode
    // 5. Extract special provisions text from parsed data
    
    // For now, simulate random extraction mode for dev
    const simulatedMode = Math.random() > 0.7 ? 'ocr' : 'acroform'
    
    // Update file with extraction mode
    await supabase
      .from('transaction_files')
      .update({ extraction_mode: simulatedMode })
      .eq('id', primaryFileId)
    
    // Simulate special provisions text for dev
    const specialProvisionsText = Math.random() > 0.5 
      ? 'Buyer requires seller to pay all closing costs and extend option period automatically.'
      : 'Seller to professionally clean home prior to closing.';
    
    // Simulate form version for dev (sometimes outdated)
    const simulatedFormVersion = Math.random() > 0.3 ? '20-18' : '20-17';
    
    // Generate dev stub issues with AI analysis and registry check
    const issues = await generateDevStubIssues(reportId, specialProvisionsText, simulatedFormVersion)
    
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
    const { user: _user, adminClient: supabase } = await getAuthenticatedContext()
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