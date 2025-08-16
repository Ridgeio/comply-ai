'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Download, FileText } from 'lucide-react'
import type { ComplianceIssue } from '@/src/app/transactions/[txId]/actions/reportActions'

interface IssuesTableProps {
  issues: ComplianceIssue[]
}

export function IssuesTable({ issues }: IssuesTableProps) {
  const [visibleSeverities, setVisibleSeverities] = useState<Set<ComplianceIssue['severity']>>(
    new Set(['critical', 'high', 'medium', 'low', 'info'])
  )

  const severityConfig = {
    critical: { label: 'critical', bgClass: 'bg-red-100', textClass: 'text-red-800' },
    high: { label: 'high', bgClass: 'bg-orange-100', textClass: 'text-orange-800' },
    medium: { label: 'medium', bgClass: 'bg-yellow-100', textClass: 'text-yellow-800' },
    low: { label: 'low', bgClass: 'bg-blue-100', textClass: 'text-blue-800' },
    info: { label: 'info', bgClass: 'bg-gray-100', textClass: 'text-gray-800' }
  }

  const toggleSeverity = (severity: ComplianceIssue['severity']) => {
    const newSet = new Set(visibleSeverities)
    if (newSet.has(severity)) {
      newSet.delete(severity)
    } else {
      newSet.add(severity)
    }
    setVisibleSeverities(newSet)
  }

  const filteredIssues = issues.filter(issue => visibleSeverities.has(issue.severity))

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(issues, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'compliance-report.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (issues.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No compliance issues found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Compliance Issues</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDownloadJSON}
        >
          <Download className="h-3 w-3 mr-1" />
          Download JSON
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Severity filter buttons */}
          <div className="flex gap-2 flex-wrap">
            {Object.entries(severityConfig).map(([severity, config]) => {
              const severityType = severity as ComplianceIssue['severity']
              const isActive = visibleSeverities.has(severityType)
              const count = issues.filter(i => i.severity === severityType).length
              
              return (
                <Button
                  key={severity}
                  size="sm"
                  variant={isActive ? 'default' : 'outline'}
                  onClick={() => toggleSeverity(severityType)}
                  disabled={count === 0}
                  className="text-xs"
                >
                  {config.label} ({count})
                </Button>
              )
            })}
          </div>

          {/* Issues table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Citation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIssues.map((issue) => {
                const config = severityConfig[issue.severity]
                return (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <Badge 
                        className={`${config.bgClass} ${config.textClass} border-0`}
                      >
                        {issue.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {issue.code}
                    </TableCell>
                    <TableCell>{issue.message}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {issue.cite || '-'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {filteredIssues.length === 0 && issues.length > 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No issues match the selected severity filters</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}