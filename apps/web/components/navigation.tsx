'use client'

import { Home, FileText, Shield, FileCheck, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Transactions',
    href: '/transactions',
    icon: FileText,
  },
  {
    title: 'Rules',
    href: '/rules',
    icon: Shield,
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: FileCheck,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export function Navigation() {
  const pathname = usePathname()
  
  return (
    <nav className="flex items-center space-x-6">
      <Link href="/dashboard" className="font-bold text-xl">
        Comply AI
      </Link>
      <div className="flex items-center space-x-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}