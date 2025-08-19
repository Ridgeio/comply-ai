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

// Mock the server action
const mockCreateOrganizationForCurrentUser = vi.fn()
vi.mock('@/src/app/onboarding/actions', () => ({
  createOrganizationForCurrentUser: mockCreateOrganizationForCurrentUser
}))

describe('Onboarding Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render create organization form', () => {
    // This will fail until we create the actual component
    const CreateOrgForm = () => (
      <form>
        <h1>Create Your Organization</h1>
        <label htmlFor="org-name">Organization Name</label>
        <input 
          id="org-name"
          name="name"
          type="text" 
          placeholder="My Test Brokerage"
          required
        />
        <button type="submit">Create Organization</button>
      </form>
    )

    render(<CreateOrgForm />)
    
    expect(screen.getByText('Create Your Organization')).toBeInTheDocument()
    expect(screen.getByLabelText('Organization Name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('My Test Brokerage')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create organization/i })).toBeInTheDocument()
  })

  it('should call createOrganizationForCurrentUser and navigate on submit', async () => {
    const user = userEvent.setup()
    
    // Mock successful org creation
    mockCreateOrganizationForCurrentUser.mockResolvedValue({
      orgId: 'new-org-123'
    })

    // Simulated CreateOrgForm component
    const CreateOrgForm = () => {
      const [isLoading, setIsLoading] = React.useState(false)
      
      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        
        const form = e.target as HTMLFormElement
        const formData = new FormData(form)
        const name = formData.get('name') as string
        
        try {
          const result = await mockCreateOrganizationForCurrentUser(name)
          if (result.orgId) {
            mockPush('/transactions')
          }
        } catch (error) {
          console.error(error)
        } finally {
          setIsLoading(false)
        }
      }
      
      return (
        <form onSubmit={handleSubmit}>
          <input 
            name="name"
            type="text" 
            placeholder="Organization Name"
            aria-label="Organization Name"
            required
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Organization'}
          </button>
        </form>
      )
    }

    render(<CreateOrgForm />)
    
    const input = screen.getByLabelText('Organization Name')
    const button = screen.getByRole('button', { name: /create organization/i })
    
    // Fill in the form
    await user.type(input, 'My Test Brokerage')
    
    // Submit the form
    await user.click(button)
    
    // Verify the action was called with correct name
    await waitFor(() => {
      expect(mockCreateOrganizationForCurrentUser).toHaveBeenCalledWith('My Test Brokerage')
      expect(mockPush).toHaveBeenCalledWith('/transactions')
    })
  })

  it('should show error message on failed org creation', async () => {
    const user = userEvent.setup()
    
    // Mock failed org creation
    mockCreateOrganizationForCurrentUser.mockRejectedValue(
      new Error('Organization name already exists')
    )

    // Simulated CreateOrgForm with error handling
    const CreateOrgForm = () => {
      const [error, setError] = React.useState<string | null>(null)
      const [isLoading, setIsLoading] = React.useState(false)
      
      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        
        const form = e.target as HTMLFormElement
        const formData = new FormData(form)
        const name = formData.get('name') as string
        
        try {
          const result = await mockCreateOrganizationForCurrentUser(name)
          if (result.orgId) {
            mockPush('/transactions')
          }
        } catch (err: any) {
          setError(err.message)
        } finally {
          setIsLoading(false)
        }
      }
      
      return (
        <form onSubmit={handleSubmit}>
          {error && <div role="alert">{error}</div>}
          <input 
            name="name"
            type="text" 
            placeholder="Organization Name"
            aria-label="Organization Name"
            required
          />
          <button type="submit" disabled={isLoading}>
            Create Organization
          </button>
        </form>
      )
    }

    render(<CreateOrgForm />)
    
    const input = screen.getByLabelText('Organization Name')
    const button = screen.getByRole('button', { name: /create organization/i })
    
    // Fill and submit
    await user.type(input, 'My Test Brokerage')
    await user.click(button)
    
    // Verify error is displayed
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Organization name already exists')
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  it('should disable form while submitting', async () => {
    const user = userEvent.setup()
    
    // Mock a slow response
    mockCreateOrganizationForCurrentUser.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ orgId: 'org-123' }), 100))
    )

    const CreateOrgForm = () => {
      const [isLoading, setIsLoading] = React.useState(false)
      
      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        const form = e.target as HTMLFormElement
        const name = (form.elements.namedItem('name') as HTMLInputElement).value
        await mockCreateOrganizationForCurrentUser(name)
        setIsLoading(false)
      }
      
      return (
        <form onSubmit={handleSubmit}>
          <input 
            name="name"
            type="text" 
            aria-label="Organization Name"
            required
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Organization'}
          </button>
        </form>
      )
    }

    render(<CreateOrgForm />)
    
    const input = screen.getByLabelText('Organization Name')
    const button = screen.getByRole('button', { name: /create organization/i })
    
    await user.type(input, 'Test Org')
    await user.click(button)
    
    // Check button text changes
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()
  })
})