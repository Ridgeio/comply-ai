import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from root .env.local
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local') })

export interface TestUser {
  email: string
  password: string
  id?: string
}

export interface TestOrg {
  id: string
  name: string
  created_by: string
}

/**
 * Creates a Supabase client with anon key for testing auth flows
 */
export function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

/**
 * Creates a Supabase client with service role key for admin operations
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase service role environment variables')
  }
  
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

/**
 * Helper to sign in as a test user
 */
export async function signInAsUser(email: string, password: string) {
  const client = createAnonClient()
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) {
    throw new Error(`Failed to sign in as ${email}: ${error.message}`)
  }
  
  return { client, user: data.user, session: data.session }
}