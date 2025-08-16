'use server'

import { getMembershipsForUser, setActiveOrgCookie } from '@/src/lib/org'

export async function switchOrg(newOrgId: string) {
  const { memberships } = await getMembershipsForUser()
  
  // Verify user is a member of the target org
  const isMember = memberships.some(m => m.org_id === newOrgId)
  
  if (!isMember) {
    throw new Error('Not a member of that organization')
  }
  
  // Set the active org cookie
  await setActiveOrgCookie(newOrgId)
  
  return { success: true }
}