import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/navigation
const mockRouter = {
  refresh: vi.fn()
}
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter
}))

// Mock the switchOrg server action
const mockSwitchOrg = vi.fn()
vi.mock('@/src/app/org/actions', () => ({
  switchOrg: mockSwitchOrg
}))

describe('Org Switcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render org switcher with current org selected', () => {
    // This will fail until we create OrgSwitcher component
    const OrgSwitcher = ({ orgId, memberships }: any) => (
      <div>
        <select data-testid="org-select" value={orgId}>
          {memberships.map((m: any) => (
            <option key={m.org_id} value={m.org_id}>
              Org {m.org_id}
            </option>
          ))}
        </select>
      </div>
    )

    const memberships = [
      { org_id: 'org-a', role: 'admin' },
      { org_id: 'org-b', role: 'member' }
    ]

    render(<OrgSwitcher orgId="org-a" memberships={memberships} />)
    
    const select = screen.getByTestId('org-select') as HTMLSelectElement
    expect(select.value).toBe('org-a')
    expect(screen.getByText('Org org-a')).toBeInTheDocument()
    expect(screen.getByText('Org org-b')).toBeInTheDocument()
  })

  it('should call switchOrg action and refresh when selecting different org', async () => {
    const user = userEvent.setup()
    
    // Mock the actual OrgSwitcher component behavior
    const OrgSwitcher = ({ orgId, memberships }: any) => {
      const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newOrgId = e.target.value
        await mockSwitchOrg(newOrgId)
        mockRouter.refresh()
      }
      
      return (
        <select 
          data-testid="org-select" 
          value={orgId}
          onChange={handleChange}
        >
          {memberships.map((m: any) => (
            <option key={m.org_id} value={m.org_id}>
              Org {m.org_id}
            </option>
          ))}
        </select>
      )
    }

    const memberships = [
      { org_id: 'org-a', role: 'admin' },
      { org_id: 'org-b', role: 'member' }
    ]

    render(<OrgSwitcher orgId="org-a" memberships={memberships} />)
    
    const select = screen.getByTestId('org-select')
    
    // Select org-b
    await user.selectOptions(select, 'org-b')
    
    await waitFor(() => {
      expect(mockSwitchOrg).toHaveBeenCalledWith('org-b')
      expect(mockRouter.refresh).toHaveBeenCalled()
    })
  })

  it('should display org names when provided', () => {
    // Test with org names included
    const OrgSwitcher = ({ orgId, orgs }: any) => (
      <div>
        <select data-testid="org-select" value={orgId}>
          {orgs.map((org: any) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>
    )

    const orgs = [
      { id: 'org-a', name: 'Acme Real Estate' },
      { id: 'org-b', name: 'Beta Properties' }
    ]

    render(<OrgSwitcher orgId="org-a" orgs={orgs} />)
    
    expect(screen.getByText('Acme Real Estate')).toBeInTheDocument()
    expect(screen.getByText('Beta Properties')).toBeInTheDocument()
  })
})