'use client'

import { Button } from '@/components/ui/button'
import { User, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/src/lib/supabaseClient'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface UserNavProps {
  user: SupabaseUser
}

export function UserNav({ user }: UserNavProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = supabaseClient()
    await supabase.auth.signOut()
    router.push('/auth/sign-in')
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4" />
        <span className="text-sm">{user.email}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className="flex items-center gap-2"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  )
}