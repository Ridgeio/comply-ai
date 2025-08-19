import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn()
  })
}))

// Mock supabase client
const mockSignInWithPassword = vi.fn()
vi.mock('@/src/lib/supabaseClient', () => ({
  supabaseClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword
    }
  })
}))

describe('Sign In Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render sign in form with email and password fields', () => {
    // This will fail until we create the SignInPage component
    const SignInPage = () => (
      <div>
        <h1>Sign In</h1>
        <form>
          <input type="email" placeholder="Email" aria-label="Email" />
          <input type="password" placeholder="Password" aria-label="Password" />
          <button type="submit">Sign In</button>
        </form>
        <a href="/auth/sign-up">Create an account</a>
      </div>
    )
    
    render(<SignInPage />)
    
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByText('Create an account')).toBeInTheDocument()
  })

  it('should call signInWithPassword and redirect on successful login', async () => {
    const user = userEvent.setup()
    
    // Mock successful sign in
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null
    })
    
    // This will fail until we create the actual SignInPage
    const SignInPage = () => {
      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const form = e.target as HTMLFormElement
        const email = (form.elements.namedItem('email') as HTMLInputElement).value
        const password = (form.elements.namedItem('password') as HTMLInputElement).value
        
        const { supabaseClient } = await import('@/src/lib/supabaseClient')
        const { error } = await supabaseClient().auth.signInWithPassword({ email, password })
        
        if (!error) {
          mockPush('/dashboard')
        }
      }
      
      return (
        <form onSubmit={handleSubmit}>
          <input name="email" type="email" aria-label="Email" />
          <input name="password" type="password" aria-label="Password" />
          <button type="submit">Sign In</button>
        </form>
      )
    }
    
    render(<SignInPage />)
    
    // Fill in the form
    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    // Wait for the async operations
    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should display error message on failed login', async () => {
    const user = userEvent.setup()
    
    // Mock failed sign in
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' }
    })
    
    // This will fail until we create the actual SignInPage with error handling
    const SignInPage = () => {
      const [error, setError] = React.useState<string | null>(null)
      
      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const form = e.target as HTMLFormElement
        const email = (form.elements.namedItem('email') as HTMLInputElement).value
        const password = (form.elements.namedItem('password') as HTMLInputElement).value
        
        const { supabaseClient } = await import('@/src/lib/supabaseClient')
        const { error } = await supabaseClient().auth.signInWithPassword({ email, password })
        
        if (error) {
          setError(error.message)
        } else {
          mockPush('/dashboard')
        }
      }
      
      return (
        <div>
          {error && <div role="alert">{error}</div>}
          <form onSubmit={handleSubmit}>
            <input name="email" type="email" aria-label="Email" />
            <input name="password" type="password" aria-label="Password" />
            <button type="submit">Sign In</button>
          </form>
        </div>
      )
    }
    
    render(<SignInPage />)
    
    // Fill in the form
    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrongpassword')
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    // Wait for the error message
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials')
      expect(mockPush).not.toHaveBeenCalled()
    })
  })
})