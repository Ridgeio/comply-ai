import type { SupabaseClient } from '@supabase/supabase-js'

export type AuditAction = 
  | 'report.generate' 
  | 'upload.file' 
  | 'rule.fire'
  | 'share.create'
  | 'share.revoke'
  | 'feedback.submit'

export type AuditTargetType = 
  | 'transaction' 
  | 'file' 
  | 'report' 
  | 'issue'
  | 'share'

export interface AuditLogEntry {
  orgId: string
  actorId: string
  action: AuditAction
  targetType: AuditTargetType
  targetId: string
  payload: Record<string, any>
}

export interface AuditLogResult {
  success: boolean
  data?: any
  error?: string
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  supabase: SupabaseClient,
  entry: AuditLogEntry
): Promise<AuditLogResult> {
  // Validate required fields
  if (!entry.orgId) {
    return { success: false, error: 'Missing required field: orgId' }
  }
  if (!entry.actorId) {
    return { success: false, error: 'Missing required field: actorId' }
  }
  if (!entry.targetId) {
    return { success: false, error: 'Missing required field: targetId' }
  }

  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      org_id: entry.orgId,
      actor_id: entry.actorId,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId,
      payload_json: entry.payload || {}
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Helper to create audit log for report generation
 */
export function createReportAuditLog(
  supabase: SupabaseClient,
  params: {
    orgId: string
    actorId: string
    reportId: string
    fileId: string
    issueCount: number
    severityCounts: Record<string, number>
    formVersion?: string
    extractionMode?: string
  }
): Promise<AuditLogResult> {
  return createAuditLog(supabase, {
    orgId: params.orgId,
    actorId: params.actorId,
    action: 'report.generate',
    targetType: 'report',
    targetId: params.reportId,
    payload: {
      fileId: params.fileId,
      issueCount: params.issueCount,
      severity: params.severityCounts,
      formVersion: params.formVersion,
      extractionMode: params.extractionMode
    }
  })
}

/**
 * Helper to create audit log for rule firing
 */
export function createRuleAuditLog(
  supabase: SupabaseClient,
  params: {
    orgId: string
    actorId: string
    issueId: string
    ruleId: string
    severity: string
    debug?: Record<string, any>
  }
): Promise<AuditLogResult> {
  return createAuditLog(supabase, {
    orgId: params.orgId,
    actorId: params.actorId,
    action: 'rule.fire',
    targetType: 'issue',
    targetId: params.issueId,
    payload: {
      ruleId: params.ruleId,
      severity: params.severity,
      debug: params.debug
    }
  })
}