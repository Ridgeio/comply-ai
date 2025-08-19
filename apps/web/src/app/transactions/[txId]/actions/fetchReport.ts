'use server';

import { createClient } from '@repo/shared';
import type { Issue } from '@repo/shared';

import { fetchLatestReport, getUserOrgId, verifyTransactionAccess } from '@/src/lib/db';

export async function fetchReport(transactionId: string) {
  try {
    const supabase = await createClient();
    const orgId = await getUserOrgId(supabase);

    if (!orgId) {
      return {
        success: false,
        error: 'User not authenticated or no organization found',
      };
    }

    // Verify user has access to this transaction
    const hasAccess = await verifyTransactionAccess(supabase, transactionId, orgId);
    if (!hasAccess) {
      return {
        success: false,
        error: 'You do not have access to this transaction',
      };
    }

    // Fetch the latest report and its issues
    const result = await fetchLatestReport(supabase, transactionId);

    if (!result) {
      return {
        success: false,
        error: 'No report found for this transaction',
      };
    }

    // Transform database issues to Issue type
    const issues: Issue[] = result.issues.map((dbIssue) => ({
      id: dbIssue.issue_id,
      message: dbIssue.message,
      severity: dbIssue.severity as Issue['severity'],
      cite: dbIssue.cite || undefined,
      data: dbIssue.data || undefined,
    }));

    return {
      success: true,
      report: {
        id: result.report.id,
        createdAt: result.report.created_at,
        summary: result.report.summary,
        metadata: result.report.metadata,
      },
      issues,
    };
  } catch (error) {
    console.error('Error fetching report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch report',
    };
  }
}