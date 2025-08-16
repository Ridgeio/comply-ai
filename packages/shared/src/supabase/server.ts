import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { checkSupabaseEnv, getServiceRoleKey } from '../supabaseEnv';
import type { Database } from '../types/supabase';

/**
 * Creates a Supabase client for server-side usage with user context
 * This should be used in server actions where you need the current user's context
 */
export async function createClient() {
  const { url, anonKey } = checkSupabaseEnv();
  
  return createSupabaseClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Creates a Supabase admin client with service role privileges
 * WARNING: This bypasses RLS and should only be used when necessary
 */
export async function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient can only be used on the server-side');
  }

  const { url } = checkSupabaseEnv();
  const serviceRoleKey = getServiceRoleKey();

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}