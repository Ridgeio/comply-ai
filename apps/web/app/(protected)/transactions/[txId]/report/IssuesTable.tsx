'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Download, FileText, ChevronDown, ChevronRight, AlertCircle, Bot } from 'lucide-react'
import type { ComplianceIssue } from '@/src/app/transactions/[txId]/actions/reportActions'

interface IssuesTableProps {
  issues: ComplianceIssue[]
}

export function IssuesTable({ issues }: IssuesTableProps) {
  const [visibleSeverities, setVisibleSeverities] = useState<Set<ComplianceIssue['severity']>>(
    new Set(['critical', 'high', 'medium', 'low', 'info'])
  )
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

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

  const toggleRowExpansion = (issueId: string) => {
    const newSet = new Set(expandedRows)
    if (newSet.has(issueId)) {
      newSet.delete(issueId)
    } else {
      newSet.add(issueId)
    }
    setExpandedRows(newSet)
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
                const hasAiDetails = issue.code.startsWith('SPECIAL_PROVISIONS_AI') && issue.details_json
                const isExpanded = expandedRows.has(issue.id)
                
                return (
                  <React.Fragment key={issue.id}>
                    <TableRow>
                      <TableCell>
                        <Badge 
                          className={`${config.bgClass} ${config.textClass} border-0`}
                        >
                          {issue.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          {issue.code}
                          {hasAiDetails && (
                            <Badge variant="outline" className="text-xs">
                              <Bot className="h-3 w-3 mr-1" />
                              AI
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{issue.message}</span>
                          {hasAiDetails && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpansion(issue.id)}
                              className="h-6 w-6 p-0"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {issue.cite || '-'}
                      </TableCell>
                    </TableRow>
                    {hasAiDetails && isExpanded && (
                      <TableRow key={`${issue.id}-details`}>
                        <TableCell colSpan={4} className="bg-muted/30">
                          <div className="p-4 space-y-3">
                            {issue.details_json?.summary && (
                              <div>
                                <h4 className="font-semibold text-sm mb-1">AI Summary</h4>
                                <p className="text-sm text-muted-foreground">
                                  {issue.details_json.summary}
                                </p>
                              </div>
                            )}
                            
                            {issue.details_json?.reasons && issue.details_json.reasons.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-sm mb-1">Identified Concerns</h4>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                  {issue.details_json.reasons.map((reason, idx) => (
                                    <li key={idx}>{reason}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {issue.details_json?.hints && issue.details_json.hints.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-sm mb-1">Pattern Matches</h4>
                                <div className="flex flex-wrap gap-2">
                                  {issue.details_json.hints.map((hint, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {hint}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <AlertCircle className="h-3 w-3" />
                              <span>This is an AI-generated analysis and should be reviewed by a qualified professional.</span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
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