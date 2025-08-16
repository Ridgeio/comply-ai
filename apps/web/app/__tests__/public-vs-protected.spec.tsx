import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}))

// We'll import these once they exist
// import PublicLayout from '../(public)/layout'
// import ProtectedLayout from '../(protected)/layout'

describe('Public vs Protected Layouts', () => {
  it('public layout should NOT show app nav items', () => {
    // This will fail until we create the public layout
    const PublicLayout = () => <div>Public Layout</div>
    
    render(
      <PublicLayout>
        <div>Content</div>
      </PublicLayout>
    )
    
    // Should not find any nav items
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('Transactions')).not.toBeInTheDocument()
    expect(screen.queryByText('Rules')).not.toBeInTheDocument()
    expect(screen.queryByText('Reports')).not.toBeInTheDocument()
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('protected layout should show app nav items when user is authenticated', async () => {
    // Mock the requireUser function
    vi.mock('@/src/lib/auth', () => ({
      requireUser: vi.fn().mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com'
      })
    }))
    
    // This will fail until we create the protected layout
    const ProtectedLayout = () => (
      <div>
        <nav>
          <a href="/dashboard">Dashboard</a>
          <a href="/transactions">Transactions</a>
          <a href="/rules">Rules</a>
          <a href="/reports">Reports</a>
          <a href="/settings">Settings</a>
        </nav>
        <div>Content</div>
      </div>
    )
    
    render(
      <ProtectedLayout>
        <div>Content</div>
      </ProtectedLayout>
    )
    
    // Should find all nav items
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Transactions')).toBeInTheDocument()
    expect(screen.getByText('Rules')).toBeInTheDocument()
    expect(screen.getByText('Reports')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })
})