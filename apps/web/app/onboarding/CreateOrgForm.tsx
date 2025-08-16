'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOrganizationForCurrentUser } from '@/src/app/onboarding/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Building2 } from 'lucide-react'

export function CreateOrgForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Organization name is required')
      return
    }
    
    setIsLoading(true)
    setError(null)

    try {
      const result = await createOrganizationForCurrentUser(name.trim())
      
      if (result.orgId) {
        // Success! Navigate to transactions
        router.push('/transactions')
      }
    } catch (err) {
      console.error('Failed to create organization:', err)
      setError(err instanceof Error ? err.message : 'Failed to create organization')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="org-name">
          <span className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organization Name
          </span>
        </Label>
        <Input
          id="org-name"
          name="name"
          type="text"
          placeholder="My Test Brokerage"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          required
          autoFocus
        />
        <p className="text-sm text-muted-foreground">
          This will be the name of your real estate brokerage or company
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={isLoading || !name.trim()}
        className="w-full"
      >
        {isLoading ? 'Creating...' : 'Create Organization'}
      </Button>
    </form>
  )
}