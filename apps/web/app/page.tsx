import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MathDemo } from '@/components/math-demo'

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Hello, Houston</h2>
        <p className="text-muted-foreground mt-2">
          Welcome to your compliance AI platform
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>
              Monitor compliance metrics and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Compliance Score</span>
                <Badge variant="default">98%</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Active Rules</span>
                <Badge variant="secondary">42</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Pending Reviews</span>
                <Badge variant="outline">3</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and workflows
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" variant="default">
              Create New Rule
            </Button>
            <Button className="w-full" variant="secondary">
              Generate Report
            </Button>
            <Button className="w-full" variant="outline">
              Review Alerts
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Current system health and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">API Status</span>
                <Badge variant="default">Operational</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Last Sync</span>
                <span className="text-sm text-muted-foreground">2 mins ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Uptime</span>
                <span className="text-sm text-muted-foreground">99.99%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <AlertTitle>Monorepo Structure Active</AlertTitle>
        <AlertDescription>
          This Next.js app is part of a pnpm workspace monorepo with Turborepo for build orchestration.
          <div className="mt-2">
            <MathDemo />
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}