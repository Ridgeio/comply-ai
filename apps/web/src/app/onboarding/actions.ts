'use server'

import { supabaseServer } from '@/src/lib/supabaseServer'
import { createAdminClient } from '@/src/lib/supabaseAdmin'
import { setActiveOrgCookie } from '@/src/lib/org'

export async function createOrganizationForCurrentUser(name: string) {
  const sb = supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  
  if (!user) {
    throw new Error('Not signed in')
  }
  
  // Use admin client for database operations
  const adminClient = createAdminClient()
  
  // Create the organization
  const { data: org, error: orgErr } = await adminClient
    .from('orgs')
    .insert({ 
      name
    })
    .select('id')
    .single()
  
  if (orgErr) {
    console.error('Failed to create org:', orgErr)
    throw new Error('Failed to create organization')
  }
  
  // Add user as admin member
  const { error: memErr } = await adminClient
    .from('org_members')
    .insert({ 
      org_id: org.id, 
      user_id: user.id, 
      role: 'admin'  // Using 'admin' as per DB schema
    })
  
  if (memErr) {
    console.error('Failed to create membership:', memErr)
    // Try to clean up the org if membership fails
    await adminClient.from('orgs').delete().eq('id', org.id)
    throw new Error('Failed to create organization membership')
  }
  
  // Set the active org cookie
  await setActiveOrgCookie(org.id)
  
  return { orgId: org.id }
}