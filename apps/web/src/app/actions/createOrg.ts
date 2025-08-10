'use server'

import { createAdminClient } from '@/src/lib/supabaseAdmin'
import { revalidatePath } from 'next/cache'

export interface CreateOrgResult {
  success: boolean
  orgId?: string
  error?: string
}

/**
 * Server action to create a new organization and add the current user as broker_admin
 * This uses service role to bypass RLS for the initial setup
 * 
 * NOTE: In production, add proper authorization checks here
 */
export async function createOrganization(name: string): Promise<CreateOrgResult> {
  try {
    const supabase = createAdminClient()
    
    // Get the current user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'User not authenticated'
      }
    }
    
    // Start a transaction to ensure both org and membership are created
    // Create the organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        created_by: user.id
      })
      .select()
      .single()
    
    if (orgError) {
      return {
        success: false,
        error: `Failed to create organization: ${orgError.message}`
      }
    }
    
    // Add the user as broker_admin
    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        org_id: org.id,
        user_id: user.id,
        role: 'broker_admin'
      })
    
    if (membershipError) {
      // Rollback by deleting the org (cascade will handle it)
      await supabase
        .from('organizations')
        .delete()
        .eq('id', org.id)
      
      return {
        success: false,
        error: `Failed to create membership: ${membershipError.message}`
      }
    }
    
    // Revalidate any cached organization lists
    revalidatePath('/dashboard')
    revalidatePath('/organizations')
    
    return {
      success: true,
      orgId: org.id
    }
  } catch (error) {
    console.error('Error creating organization:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Server action to get organizations for the current user
 */
export async function getUserOrganizations() {
  try {
    const supabase = createAdminClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'User not authenticated',
        organizations: []
      }
    }
    
    // Get organizations through memberships
    const { data: memberships, error } = await supabase
      .from('memberships')
      .select(`
        role,
        organizations:org_id (
          id,
          name,
          created_at
        )
      `)
      .eq('user_id', user.id)
    
    if (error) {
      return {
        success: false,
        error: error.message,
        organizations: []
      }
    }
    
    return {
      success: true,
      organizations: memberships || []
    }
  } catch (error) {
    console.error('Error fetching organizations:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      organizations: []
    }
  }
}