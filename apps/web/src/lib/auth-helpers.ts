import type { User } from '@supabase/supabase-js'

import { createAdminClient } from './supabaseAdmin'
import { supabaseServer } from './supabaseServer'

/**
 * Gets the authenticated user and returns both the user and an admin client
 * This pattern ensures we properly authenticate the user from the session
 * before using admin privileges for database operations
 */
export async function getAuthenticatedContext(): Promise<{
  user: User
  adminClient: ReturnType<typeof createAdminClient>
}> {
  // Get user from session
  const serverSupabase = supabaseServer()
  const { data: { user }, error } = await serverSupabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Authentication required')
  }
  
  // Return user and admin client for database operations
  return {
    user,
    adminClient: createAdminClient()
  }
}