'use server'

import { createAdminClient } from '@/src/lib/supabaseAdmin'
import type { User } from '@supabase/supabase-js'

export async function onboardAfterSignup(userId: string) {
  try {
    const supabase = createAdminClient()
    
    // Check if user already has an org membership
    const { data: existingMembership } = await supabase
      .from('org_members')
      .select('id')
      .eq('user_id', userId)
      .single()
    
    if (existingMembership) {
      // User already has an org, no need to create one
      return { success: true }
    }
    
    // Get user details
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    
    if (!user) {
      throw new Error('User not found')
    }
    
    // Create a new org for the user
    const orgName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'My Brokerage'
    
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .insert({
        name: orgName
      })
      .select()
      .single()
    
    if (orgError) throw orgError
    
    // Add user as broker_admin of the new org
    const { error: memberError } = await supabase
      .from('org_members')
      .insert({
        org_id: org.id,
        user_id: userId,
        role: 'broker_admin'
      })
    
    if (memberError) throw memberError
    
    return { success: true, orgId: org.id }
  } catch (error) {
    console.error('Error during onboarding:', error)
    return { success: false, error: 'Failed to create organization' }
  }
}