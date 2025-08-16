import { redirect } from 'next/navigation'
import { supabaseServer } from '@/src/lib/supabaseServer'

export default async function RootPage() {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  
  redirect(user ? '/dashboard' : '/auth/sign-in')
}