import { redirect } from 'next/navigation'

import { CreateOrgForm } from './CreateOrgForm'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getMembershipsForUser } from '@/src/lib/org'

export default async function OnboardingPage() {
  // Check if user already has an organization
  const { memberships } = await getMembershipsForUser()
  
  if (memberships.length > 0) {
    // User already has an org, redirect to dashboard
    redirect('/dashboard')
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Comply AI</CardTitle>
            <CardDescription>
              Let's get started by creating your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateOrgForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}