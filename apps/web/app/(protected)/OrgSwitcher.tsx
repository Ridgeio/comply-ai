'use client'

import { Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { switchOrg } from '@/src/app/org/actions'


interface OrgSwitcherProps {
  currentOrgId: string
  organizations: Array<{
    id: string
    name: string
    role: string
  }>
}

export function OrgSwitcher({ currentOrgId, organizations }: OrgSwitcherProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  const currentOrg = organizations.find(org => org.id === currentOrgId)
  
  const handleOrgChange = async (newOrgId: string) => {
    if (newOrgId === currentOrgId) return
    
    setIsLoading(true)
    try {
      await switchOrg(newOrgId)
      router.refresh()
    } catch (error) {
      console.error('Failed to switch organization:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Don't show switcher if only one org
  if (organizations.length <= 1) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span>{currentOrg?.name}</span>
      </div>
    )
  }
  
  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentOrgId}
        onValueChange={handleOrgChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[200px]" data-testid="org-select">
          <SelectValue>
            {currentOrg?.name || 'Select organization'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              <div className="flex items-center justify-between w-full">
                <span>{org.name}</span>
                {org.role === 'admin' && (
                  <span className="text-xs text-muted-foreground ml-2">Admin</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}