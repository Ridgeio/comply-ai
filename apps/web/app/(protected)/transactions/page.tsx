import { requireCurrentOrg } from '@/src/lib/org'
import { createAdminClient } from '@/src/lib/supabaseAdmin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NewTransactionModal } from './NewTransactionModal'
import Link from 'next/link'
import { format } from 'date-fns'

interface Transaction {
  id: string
  org_id: string
  title: string
  status: 'draft' | 'active' | 'completed' | 'archived'
  created_at: string
  updated_at: string
}

export default async function TransactionsPage() {
  // Get current org - will redirect to onboarding if none
  const orgId = await requireCurrentOrg()
  
  // Use admin client for database operations
  const adminSupabase = createAdminClient()
  
  // Fetch transactions for the organization
  const { data: transactions, error: txError } = await adminSupabase
    .from('transactions')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  
  if (txError) {
    console.error('Error fetching transactions:', txError)
    return <div>Error loading transactions</div>
  }
  
  const transactionList = (transactions || []) as Transaction[]
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <NewTransactionModal />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactionList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions yet. Click "New Transaction" to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionList.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">
                      <Link 
                        href={`/transactions/${tx.id}`}
                        className="hover:underline"
                      >
                        {tx.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        tx.status === 'active' ? 'default' :
                        tx.status === 'completed' ? 'secondary' :
                        tx.status === 'archived' ? 'outline' :
                        'secondary'
                      }>
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(tx.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/transactions/${tx.id}`}>
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}