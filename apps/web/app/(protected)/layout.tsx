import { OrgSwitcher } from './OrgSwitcher'

import { Navigation } from '@/components/navigation'
import { UserNav } from '@/components/user-nav'
import { requireUser } from '@/src/lib/auth'
import { requireCurrentOrg, getUserOrganizations } from '@/src/lib/org'


export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()
  const currentOrgId = await requireCurrentOrg()
  const organizations = await getUserOrganizations()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto">
          <div className="flex h-16 items-center px-4">
            <Navigation />
            <div className="ml-auto flex items-center gap-4">
              <OrgSwitcher 
                currentOrgId={currentOrgId} 
                organizations={organizations}
              />
              <UserNav user={user} />
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}