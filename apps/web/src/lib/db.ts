import type { Issue } from '@repo/shared';
import type { Database } from '@repo/shared/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export type Report = Database['public']['Tables']['reports']['Row'];
export type DbIssue = Database['public']['Tables']['issues']['Row'];

export async function insertReport(
  supabase: SupabaseClient<Database>,
  data: {
    transaction_id: string;
    org_id: string;
    file_id: string;
    summary: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }
) {
  // Map transaction_id to tx_id for the database
  const { transaction_id, ...rest } = data;
  const { data: report, error } = await supabase
    .from('reports')
    .insert({ ...rest, tx_id: transaction_id })
    .select()
    .single();

  if (error) throw error;
  return report;
}

export async function insertIssues(
  supabase: SupabaseClient<Database>,
  reportId: string,
  orgId: string,
  issues: Issue[]
) {
  if (issues.length === 0) return [];

  const issueRows = issues.map((issue) => ({
    report_id: reportId,
    org_id: orgId,
    severity: issue.severity,
    rule_id: issue.id,
    message: issue.message,
    cite: issue.cite || null,
    details_json: issue.data || null,
  }));

  const { data, error } = await supabase
    .from('issues')
    .insert(issueRows)
    .select();

  if (error) throw error;
  return data;
}

export async function fetchLatestReport(
  supabase: SupabaseClient<Database>,
  transactionId: string
) {
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('*')
    .eq('tx_id', transactionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (reportError || !report) {
    return null;
  }

  const { data: issues, error: issuesError } = await supabase
    .from('issues')
    .select('*')
    .eq('report_id', report.id)
    .order('severity', { ascending: true });

  if (issuesError) {
    throw issuesError;
  }

  return {
    report,
    issues: issues || [],
  };
}

export async function getUserOrgId(supabase: SupabaseClient<Database>): Promise<string | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  return user.user_metadata?.org_id || null;
}

export async function verifyTransactionAccess(
  supabase: SupabaseClient<Database>,
  transactionId: string,
  orgId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('transactions')
    .select('id')
    .eq('id', transactionId)
    .eq('org_id', orgId)
    .single();

  return !error && !!data;
}