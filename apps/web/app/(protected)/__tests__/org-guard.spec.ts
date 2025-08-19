import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn()
}))

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn()
  }))
}))

// Mock supabaseServer
vi.mock('@/src/lib/supabaseServer', () => ({
  supabaseServer: vi.fn()
}))

// Mock createAdminClient
vi.mock('@/src/lib/supabaseAdmin', () => ({
  createAdminClient: vi.fn()
}))

describe('Organization Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('requireCurrentOrg', () => {
    it('should redirect to /onboarding when user has no memberships', async () => {
      const { supabaseServer } = await import('@/src/lib/supabaseServer')
      const { createAdminClient } = await import('@/src/lib/supabaseAdmin')
      
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null
          })
        }
      }
      ;(supabaseServer as any).mockReturnValue(mockSupabase)
      
      const mockAdminClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: [], // No memberships
              error: null
            })
          }))
        }))
      }
      ;(createAdminClient as any).mockReturnValue(mockAdminClient)

      // This will fail until we implement requireCurrentOrg
      const { requireCurrentOrg } = await import('@/src/lib/org')
      
      await requireCurrentOrg()
      
      expect(redirect).toHaveBeenCalledWith('/onboarding')
    })

    it('should return activeOrgId from cookie when user has matching membership', async () => {
      const { supabaseServer } = await import('@/src/lib/supabaseServer')
      const { createAdminClient } = await import('@/src/lib/supabaseAdmin')
      
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null
          })
        }
      }
      ;(supabaseServer as any).mockReturnValue(mockSupabase)
      
      const mockAdminClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: [
                { org_id: 'org-a', role: 'admin' },
                { org_id: 'org-b', role: 'member' }
              ],
              error: null
            })
          }))
        }))
      }
      ;(createAdminClient as any).mockReturnValue(mockAdminClient)

      // Mock cookies to return activeOrgId
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'org-b' }),
        set: vi.fn()
      }
      ;(cookies as any).mockReturnValue(mockCookies)

      const { requireCurrentOrg } = await import('@/src/lib/org')
      const orgId = await requireCurrentOrg()
      
      expect(orgId).toBe('org-b')
      expect(redirect).not.toHaveBeenCalled()
    })

    it('should return first membership org_id when no cookie is set', async () => {
      const { supabaseServer } = await import('@/src/lib/supabaseServer')
      const { createAdminClient } = await import('@/src/lib/supabaseAdmin')
      
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null
          })
        }
      }
      ;(supabaseServer as any).mockReturnValue(mockSupabase)
      
      const mockAdminClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: [
                { org_id: 'org-first', role: 'admin' },
                { org_id: 'org-second', role: 'member' }
              ],
              error: null
            })
          }))
        }))
      }
      ;(createAdminClient as any).mockReturnValue(mockAdminClient)

      // Mock cookies to return no activeOrgId
      const mockCookies = {
        get: vi.fn().mockReturnValue(undefined),
        set: vi.fn()
      }
      ;(cookies as any).mockReturnValue(mockCookies)

      const { requireCurrentOrg } = await import('@/src/lib/org')
      const orgId = await requireCurrentOrg()
      
      expect(orgId).toBe('org-first')
      expect(redirect).not.toHaveBeenCalled()
    })
  })

  describe('getMembershipsForUser', () => {
    it('should redirect to sign-in when no user is authenticated', async () => {
      const { supabaseServer } = await import('@/src/lib/supabaseServer')
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null
          })
        }
      }
      ;(supabaseServer as any).mockReturnValue(mockSupabase)

      const { getMembershipsForUser } = await import('@/src/lib/org')
      
      await getMembershipsForUser()
      
      expect(redirect).toHaveBeenCalledWith('/auth/sign-in')
    })

    it('should return user and memberships when authenticated', async () => {
      const { supabaseServer } = await import('@/src/lib/supabaseServer')
      const { createAdminClient } = await import('@/src/lib/supabaseAdmin')
      
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockMemberships = [
        { org_id: 'org-1', role: 'admin' },
        { org_id: 'org-2', role: 'member' }
      ]
      
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null
          })
        }
      }
      ;(supabaseServer as any).mockReturnValue(mockSupabase)
      
      const mockAdminClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: mockMemberships,
              error: null
            })
          }))
        }))
      }
      ;(createAdminClient as any).mockReturnValue(mockAdminClient)

      const { getMembershipsForUser } = await import('@/src/lib/org')
      const result = await getMembershipsForUser()
      
      expect(result.user).toEqual(mockUser)
      expect(result.memberships).toEqual(mockMemberships)
    })
  })

  describe('setActiveOrgCookie', () => {
    it('should set the activeOrgId cookie', async () => {
      const mockCookies = {
        get: vi.fn(),
        set: vi.fn()
      }
      ;(cookies as any).mockReturnValue(mockCookies)

      const { setActiveOrgCookie } = await import('@/src/lib/org')
      const result = await setActiveOrgCookie('org-123')
      
      expect(mockCookies.set).toHaveBeenCalledWith(
        'activeOrgId',
        'org-123',
        { path: '/', httpOnly: false, sameSite: 'lax' }
      )
      expect(result).toBe('org-123')
    })
  })
})