import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Upload, FileCheck, Plus, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  // In a real app, these would come from the database
  const recentReports = [
    { id: '1', name: '123 Main Street Contract', date: '2024-01-15', status: 'completed', issues: 3 },
    { id: '2', name: '456 Oak Avenue Lease', date: '2024-01-14', status: 'processing', issues: 0 },
    { id: '3', name: '789 Pine Road Agreement', date: '2024-01-13', status: 'completed', issues: 7 }
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to your compliance dashboard
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Transaction
            </CardTitle>
            <CardDescription>
              Start a new compliance review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/transactions">
              <Button className="w-full">
                New Transaction
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Files
            </CardTitle>
            <CardDescription>
              Add documents to existing transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/transactions">
              <Button variant="secondary" className="w-full">
                Browse Transactions
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Compliance Status
            </CardTitle>
            <CardDescription>
              Overview of your compliance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Active Transactions</span>
                <Badge>12</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pending Reviews</span>
                <Badge variant="secondary">3</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Compliance Score</span>
                <Badge variant="default">98%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>
                Your latest compliance reports and their status
              </CardDescription>
            </div>
            <Link href="/reports">
              <Button variant="ghost" size="sm" className="gap-1">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {report.name}
                    </div>
                  </TableCell>
                  <TableCell>{report.date}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={report.status === 'completed' ? 'default' : 'secondary'}
                    >
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {report.issues > 0 ? (
                      <Badge variant="outline">{report.issues}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}