import { getTransactionFiles } from './actions/uploadFiles'
import { createAdminClient } from '@/src/lib/supabaseAdmin'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Upload, FileText, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface TransactionPageProps {
  params: {
    txId: string
  }
}

export default async function TransactionPage({ params }: TransactionPageProps) {
  const { txId } = params
  
  // Fetch transaction details
  const supabase = createAdminClient()
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .select(`
      *,
      organizations (
        id,
        name
      )
    `)
    .eq('id', txId)
    .single()

  if (txError || !transaction) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Transaction not found or you don't have access to it.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Fetch files and their job statuses
  const { files } = await getTransactionFiles(txId)

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'queued':
        return <Badge variant="secondary">Queued</Badge>
      case 'processing':
        return <Badge className="bg-blue-500">Processing</Badge>
      case 'done':
        return <Badge className="bg-green-500">Completed</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="outline">No Job</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const extractFileName = (path: string) => {
    const parts = path.split('/')
    const filename = parts[parts.length - 1]
    // Remove UUID prefix if present
    const match = filename.match(/^[a-f0-9-]+-(.+)$/)
    return match ? match[1] : filename
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {transaction.title || 'Untitled Transaction'}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Organization: {transaction.organizations?.name}</span>
              <Badge variant="outline">{transaction.status}</Badge>
              <span>Created: {formatDate(transaction.created_at)}</span>
            </div>
          </div>
          <Link href={`/transactions/${txId}/upload`}>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Documents
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Documents</CardTitle>
          <CardDescription>
            All documents uploaded for this transaction and their processing status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                No documents uploaded yet
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Upload PDF documents to start the compliance analysis
              </p>
              <Link href={`/transactions/${txId}/upload`}>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload First Document
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Processing Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file: any) => {
                  const latestJob = file.ingest_jobs?.[0]
                  return (
                    <TableRow key={file.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {extractFileName(file.path)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{file.kind}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(latestJob?.status)}
                          {getStatusBadge(latestJob?.status)}
                        </div>
                        {latestJob?.error && (
                          <p className="text-xs text-red-500 mt-1">
                            {latestJob.error}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(file.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" disabled>
                            View
                          </Button>
                          {latestJob?.status === 'error' && (
                            <Button variant="ghost" size="sm" disabled>
                              Retry
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Processing Summary */}
      {files.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Processing Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{files.length}</p>
                <p className="text-sm text-gray-500">Total Files</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-500">
                  {files.filter((f: any) => f.ingest_jobs?.[0]?.status === 'queued').length}
                </p>
                <p className="text-sm text-gray-500">Queued</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">
                  {files.filter((f: any) => f.ingest_jobs?.[0]?.status === 'processing').length}
                </p>
                <p className="text-sm text-gray-500">Processing</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">
                  {files.filter((f: any) => f.ingest_jobs?.[0]?.status === 'done').length}
                </p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Import Alert component
import { Alert, AlertDescription } from '@/components/ui/alert'