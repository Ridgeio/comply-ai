import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function RulesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rules</h1>
        <p className="text-muted-foreground mt-2">
          Manage your compliance rules and validation logic
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compliance Rules</CardTitle>
          <CardDescription>
            Configure rules for document validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Rules management coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}