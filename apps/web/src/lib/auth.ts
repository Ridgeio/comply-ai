import { redirect } from 'next/navigation'

import { supabaseServer } from './supabaseServer'

export async function requireUser() {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/sign-in')
  }
  
  return user
}