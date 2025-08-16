import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseServer } from './supabaseServer'
import { createAdminClient } from './supabaseAdmin'

/**
 * Get all memberships for the current authenticated user
 */
export async function getMembershipsForUser() {
  const sb = supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  
  if (!user) {
    redirect('/auth/sign-in')
    // For tests, we need to return something
    return { user: null as any, memberships: [] }
  }
  
  // Use admin client for database queries
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.id)
  
  if (error) throw error
  
  return { user, memberships: data ?? [] }
}

/**
 * Returns a valid orgId or redirects to /onboarding when none exist
 */
export async function requireCurrentOrg(): Promise<string> {
  const { user, memberships } = await getMembershipsForUser()
  
  if (!memberships.length) {
    redirect('/onboarding')
    // For tests, we need to return something
    return '' as any
  }
  
  const cookieStore = cookies()
  const active = cookieStore.get('activeOrgId')?.value
  
  // Check if the active org from cookie is still valid
  const match = memberships.find(m => m.org_id === active)?.org_id
  
  // Return matched org or first membership
  return match || memberships[0].org_id
}

/**
 * Sets the active organization cookie
 */
export async function setActiveOrgCookie(orgId: string) {
  const c = cookies()
  c.set('activeOrgId', orgId, { 
    path: '/', 
    httpOnly: false, 
    sameSite: 'lax' 
  })
  return orgId
}

/**
 * Get the current organization ID for a user
 * @deprecated Use requireCurrentOrg() instead
 */
export async function getCurrentOrgId(userId: string): Promise<string> {
  const adminClient = createAdminClient()
  
  // Get the user's first organization membership
  const { data: membership, error } = await adminClient
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  
  if (error || !membership) {
    throw new Error('No organization found for user')
  }
  
  return membership.org_id
}

/**
 * Get all organizations with details for the current user
 */
export async function getUserOrganizations() {
  const { user, memberships } = await getMembershipsForUser()
  
  if (!memberships.length) {
    return []
  }
  
  const adminClient = createAdminClient()
  const orgIds = memberships.map(m => m.org_id)
  
  const { data: orgs, error } = await adminClient
    .from('orgs')
    .select('id, name')
    .in('id', orgIds)
  
  if (error) throw error
  
  // Combine org details with membership roles
  return orgs?.map(org => ({
    ...org,
    role: memberships.find(m => m.org_id === org.id)?.role || 'member'
  })) || []
}