import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAuditLog, AuditAction, AuditTargetType } from '../audit'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Audit Logging', () => {
  let mockSupabase: Partial<SupabaseClient>
  let mockFrom: any

  beforeEach(() => {
    mockFrom = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn()
    }
    
    mockSupabase = {
      from: vi.fn(() => mockFrom)
    }
  })

  describe('createAuditLog', () => {
    it('should create an audit log entry for report generation', async () => {
      const auditData = {
        orgId: 'org-123',
        actorId: 'user-456',
        action: 'report.generate' as AuditAction,
        targetType: 'report' as AuditTargetType,
        targetId: 'report-789',
        payload: {
          fileId: 'file-001',
          issueCount: 5,
          severity: { critical: 1, high: 2, medium: 2 }
        }
      }

      mockFrom.single.mockResolvedValue({
        data: { id: 'audit-001', ...auditData },
        error: null
      })

      const result = await createAuditLog(mockSupabase as SupabaseClient, auditData)

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs')
      expect(mockFrom.insert).toHaveBeenCalledWith({
        org_id: auditData.orgId,
        actor_id: auditData.actorId,
        action: auditData.action,
        target_type: auditData.targetType,
        target_id: auditData.targetId,
        payload_json: auditData.payload
      })
      expect(result).toEqual({
        success: true,
        data: { id: 'audit-001', ...auditData }
      })
    })

    it('should create an audit log entry for rule firing', async () => {
      const auditData = {
        orgId: 'org-123',
        actorId: 'user-456',
        action: 'rule.fire' as AuditAction,
        targetType: 'issue' as AuditTargetType,
        targetId: 'issue-789',
        payload: {
          ruleId: 'trec20.buyers.missing',
          severity: 'critical',
          debug: {
            buyerNames: [],
            expectedMinimum: 1
          }
        }
      }

      mockFrom.single.mockResolvedValue({
        data: { id: 'audit-002', ...auditData },
        error: null
      })

      const result = await createAuditLog(mockSupabase as SupabaseClient, auditData)

      expect(mockFrom.insert).toHaveBeenCalledWith({
        org_id: auditData.orgId,
        actor_id: auditData.actorId,
        action: auditData.action,
        target_type: auditData.targetType,
        target_id: auditData.targetId,
        payload_json: auditData.payload
      })
      expect(result.success).toBe(true)
    })

    it('should handle database errors gracefully', async () => {
      const auditData = {
        orgId: 'org-123',
        actorId: 'user-456',
        action: 'upload.file' as AuditAction,
        targetType: 'file' as AuditTargetType,
        targetId: 'file-789',
        payload: { fileName: 'contract.pdf' }
      }

      mockFrom.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: '500' }
      })

      const result = await createAuditLog(mockSupabase as SupabaseClient, auditData)

      expect(result).toEqual({
        success: false,
        error: 'Database error'
      })
    })

    it('should validate required fields', async () => {
      const invalidData = {
        orgId: '',
        actorId: 'user-456',
        action: 'report.generate' as AuditAction,
        targetType: 'report' as AuditTargetType,
        targetId: 'report-789',
        payload: {}
      }

      const result = await createAuditLog(mockSupabase as SupabaseClient, invalidData)

      expect(result).toEqual({
        success: false,
        error: 'Missing required field: orgId'
      })
      expect(mockFrom.insert).not.toHaveBeenCalled()
    })
  })
})