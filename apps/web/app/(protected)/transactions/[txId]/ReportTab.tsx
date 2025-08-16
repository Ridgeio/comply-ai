'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getLatestReportWithIssues } from '@/src/app/transactions/[txId]/actions/reportActions'
import { ReportSummary } from './report/ReportSummary'
import { IssuesTable } from './report/IssuesTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, Loader2 } from 'lucide-react'

interface ReportTabProps {
  txId: string
}

export function ReportTab({ txId }: ReportTabProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [reportData, setReportData] = useState<Awaited<ReturnType<typeof getLatestReportWithIssues>>>(null)

  useEffect(() => {
    const loadReport = async () => {
      try {
        const data = await getLatestReportWithIssues(txId)
        setReportData(data)
      } catch (error) {
        console.error('Failed to load report:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadReport()
  }, [txId])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!reportData) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">No report generated yet</p>
          <p className="text-sm text-muted-foreground mb-6">
            Upload files and generate a report to see compliance issues
          </p>
          <Button
            onClick={() => router.push(`/transactions/${txId}?tab=files`)}
          >
            Generate Report
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Compliance Report</h2>
        <p className="text-sm text-muted-foreground">
          Generated: {new Date(reportData.report.created_at).toLocaleDateString()}
        </p>
      </div>

      <ReportSummary countsBySeverity={reportData.countsBySeverity} />
      
      <IssuesTable issues={reportData.issues} />
    </div>
  )
}