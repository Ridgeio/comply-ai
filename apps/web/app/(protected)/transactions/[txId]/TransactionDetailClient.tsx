'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, FileCheck } from 'lucide-react'
import { FilesTab } from './FilesTab'
import { ReportTab } from './ReportTab'

interface TransactionDetailClientProps {
  transaction: {
    id: string
    title: string
    status: string
    org_name: string
  }
}

export function TransactionDetailClient({ transaction }: TransactionDetailClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') || 'files'
  
  const handleTabChange = (value: string) => {
    router.push(`/transactions/${transaction.id}?tab=${value}`)
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">{transaction.title}</h1>
          <Badge variant={
            transaction.status === 'active' ? 'default' :
            transaction.status === 'completed' ? 'secondary' :
            transaction.status === 'archived' ? 'outline' :
            'secondary'
          }>
            {transaction.status}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Organization: {transaction.org_name}
        </p>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Files
          </TabsTrigger>
          <TabsTrigger value="report" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Report
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="files" className="mt-6">
          <FilesTab txId={transaction.id} />
        </TabsContent>
        
        <TabsContent value="report" className="mt-6">
          <ReportTab txId={transaction.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}