import { createClient } from '@supabase/supabase-js'
import { checkSupabaseEnv, getServiceRoleKey } from '@repo/shared'

/**
 * Creates a Supabase admin client with service role privileges
 * WARNING: This should only be used on the server-side (API routes, server components, server actions)
 * Never expose the service role key to the client
 */
export function createAdminClient() {
  // This will only run on the server
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient can only be used on the server-side')
  }

  const { url } = checkSupabaseEnv()
  const serviceRoleKey = getServiceRoleKey()

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Creates a Supabase client for client-side usage
 * Uses the anon key which is safe to expose to the browser
 */
export function createBrowserClient() {
  const { url, anonKey } = checkSupabaseEnv()
  
  return createClient(url, anonKey)
}