'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@repo/shared/types/supabase'

export function supabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}