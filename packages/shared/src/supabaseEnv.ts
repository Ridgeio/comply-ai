export interface SupabaseEnvConfig {
  url: string
  anonKey: string
}

/**
 * Validates that required Supabase environment variables are present
 * @throws Error if required environment variables are missing
 * @returns Validated Supabase configuration
 */
export function checkSupabaseEnv(): SupabaseEnvConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!anonKey) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return {
    url,
    anonKey
  }
}

/**
 * Gets the Supabase service role key (server-side only)
 * @throws Error if service role key is missing
 * @returns Service role key
 */
export function getServiceRoleKey(): string {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  
  if (!serviceRoleKey) {
    throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY')
  }
  
  return serviceRoleKey
}