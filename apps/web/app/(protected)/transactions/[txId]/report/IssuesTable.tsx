'use client'

import { 
  Download, 
  FileText, 
  ChevronDown, 
  ChevronRight, 
  AlertCircle, 
  Bot, 
  Copy, 
  Search,
  Check
} from 'lucide-react'
import React, { useState, useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import type { ComplianceIssue } from '@/src/app/transactions/[txId]/actions/reportActions'

interface IssuesTableProps {
  issues: ComplianceIssue[]
  report?: {
    id: string;
    tx_id: string;
    form_type?: string;
    form_version?: string;
    created_at: string;
    updated_at: string;
  }
}

export function IssuesTable({ issues, report }: IssuesTableProps) {
  const [visibleSeverities, setVisibleSeverities] = useState<Set<ComplianceIssue['severity']>>(
    new Set(['critical', 'high', 'medium', 'low', 'info'])
  )
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set())
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { toast } = useToast()

  const severityConfig = {
    critical: { label: 'critical', variant: 'destructive' as const, bgClass: 'bg-destructive', textClass: 'text-destructive-foreground' },
    high: { label: 'high', variant: 'default' as const, bgClass: 'bg-primary', textClass: 'text-primary-foreground' },
    medium: { label: 'medium', variant: 'secondary' as const, bgClass: 'bg-secondary', textClass: 'text-secondary-foreground' },
    low: { label: 'low', variant: 'outline' as const, bgClass: 'border', textClass: 'text-foreground' },
    info: { label: 'info', variant: 'secondary' as const, bgClass: 'bg-muted', textClass: 'text-muted-foreground' }
  }

  // Extract categories from issue codes
  const categories = useMemo(() => {
    const categoryMap = new Map<string, number>()
    issues.forEach(issue => {
      // Determine category based on code patterns
      let category = 'Other'
      if (issue.code.includes('trec20')) {
        category = 'Contract 20-18'
      } else if (issue.code.includes('trec40')) {
        category = 'Financing 40-11'
      } else if (issue.code.includes('trec36')) {
        category = 'POA 36-10'
      } else if (issue.code.includes('trec39')) {
        category = 'Amendment 39-10'
      } else if (issue.code.includes('special_provisions.ai') || issue.code.includes('ai_')) {
        category = 'AI'
      }
      
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1)
    })
    return Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count }))
  }, [issues])

  const toggleSeverity = (severity: ComplianceIssue['severity']) => {
    const newSet = new Set(visibleSeverities)
    if (newSet.has(severity)) {
      newSet.delete(severity)
    } else {
      newSet.add(severity)
    }
    setVisibleSeverities(newSet)
  }

  const toggleCategory = (category: string) => {
    const newSet = new Set(visibleCategories)
    if (newSet.has(category)) {
      newSet.delete(category)
    } else {
      newSet.add(category)
    }
    setVisibleCategories(newSet)
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

  const copyIssueJson = async (issue: ComplianceIssue) => {
    const json = JSON.stringify(issue, null, 2)
    await navigator.clipboard.writeText(json)
    setCopiedId(issue.id)
    toast({
      title: 'Copied to clipboard',
      description: 'Issue JSON has been copied to your clipboard'
    })
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      // Filter by severity
      if (!visibleSeverities.has(issue.severity)) return false
      
      // Filter by category if any are selected
      if (visibleCategories.size > 0) {
        let issueCategory = 'Other'
        if (issue.code.includes('trec20')) issueCategory = 'Contract 20-18'
        else if (issue.code.includes('trec40')) issueCategory = 'Financing 40-11'
        else if (issue.code.includes('trec36')) issueCategory = 'POA 36-10'
        else if (issue.code.includes('trec39')) issueCategory = 'Amendment 39-10'
        else if (issue.code.includes('special_provisions.ai') || issue.code.includes('ai_')) issueCategory = 'AI'
        
        if (!visibleCategories.has(issueCategory)) return false
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          issue.message.toLowerCase().includes(query) ||
          issue.code.toLowerCase().includes(query) ||
          issue.id.toLowerCase().includes(query)
        )
      }
      
      return true
    })
  }, [issues, visibleSeverities, visibleCategories, searchQuery])

  const handleDownloadJSON = () => {
    const exportData = {
      report,
      issues
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'compliance-report.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderDetailsJson = (details: any) => {
    if (!details) return null
    
    return (
      <div className="space-y-2">
        {Object.entries(details).map(([key, value]) => {
          // Skip complex nested objects that are handled separately
          if (key === 'summary' || key === 'reasons' || key === 'hints') return null
          
          return (
            <div key={key} className="flex gap-2">
              <span className="font-medium text-sm">{key}:</span>
              <span className="text-sm text-muted-foreground">
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          )
        })}
      </div>
    )
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
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search issues by message, code, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Severity filter buttons */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Severity Filters</h4>
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
          </div>

          {/* Category filter buttons */}
          {categories.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Category Filters</h4>
              <div className="flex gap-2 flex-wrap">
                {categories.map(({ name, count }) => {
                  const isActive = visibleCategories.has(name)
                  return (
                    <Button
                      key={name}
                      size="sm"
                      variant={isActive ? 'default' : 'outline'}
                      onClick={() => toggleCategory(name)}
                      className="text-xs"
                    >
                      {name} ({count})
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Issues table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Severity</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Citation</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIssues.map((issue) => {
                const config = severityConfig[issue.severity]
                const hasDetails = issue.details_json && Object.keys(issue.details_json).length > 0
                const isExpanded = expandedRows.has(issue.id)
                const isAiIssue = issue.code.includes('special_provisions.ai') || issue.code.includes('ai_')
                
                return (
                  <React.Fragment key={issue.id}>
                    <TableRow>
                      <TableCell>
                        <Badge variant={config.variant} className={config.variant === 'outline' ? 'border' : ''}>
                          {issue.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          {issue.code}
                          {isAiIssue && (
                            <Badge variant="outline" className="text-xs">
                              <Bot className="h-3 w-3 mr-1" />
                              AI
                            </Badge>
                          )}
                          {issue.code.includes('.version.outdated') && issue.details_json && 'found' in issue.details_json && (
                            <Badge variant="destructive" className="text-xs">
                              Version: {(issue.details_json as any).found} (Outdated)
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span>{issue.message}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {issue.cite || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {hasDetails && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpansion(issue.id)}
                              className="h-8 w-8 p-0"
                              aria-label="expand"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyIssueJson(issue)}
                            className="h-8 w-8 p-0"
                            aria-label="copy"
                          >
                            {copiedId === issue.id ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {hasDetails && isExpanded && (
                      <TableRow key={`${issue.id}-details`}>
                        <TableCell colSpan={5} className="bg-muted/30">
                          <div className="p-4 space-y-3">
                            {renderDetailsJson(issue.details_json)}
                            
                            {issue.details_json?.summary && (
                              <div>
                                <h4 className="font-semibold text-sm mb-1">Summary</h4>
                                <p className="text-sm text-muted-foreground">
                                  {issue.details_json.summary}
                                </p>
                              </div>
                            )}
                            
                            {issue.details_json?.reasons && issue.details_json.reasons.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-sm mb-1">Reasons</h4>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                  {issue.details_json.reasons.map((reason: string, idx: number) => (
                                    <li key={idx}>{reason}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {issue.details_json?.hints && issue.details_json.hints.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-sm mb-1">Pattern Matches</h4>
                                <div className="flex flex-wrap gap-2">
                                  {issue.details_json.hints.map((hint: string, idx: number) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {hint}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {isAiIssue && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <AlertCircle className="h-3 w-3" />
                                <span>This is an AI-generated analysis and should be reviewed by a qualified professional.</span>
                              </div>
                            )}
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
              <p>No issues match the selected filters</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}