'use client';

import { format } from 'date-fns';
import { RefreshCw, Clock } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { generateReport } from '@/src/app/transactions/[txId]/actions/reportActions';
import type { ComplianceIssue } from '@/src/app/transactions/[txId]/actions/reportActions';

interface ReportSummaryProps {
  countsBySeverity?: Record<ComplianceIssue['severity'], number>;
  report?: {
    id: string;
    tx_id: string;
    created_at: string;
    updated_at: string;
  };
  issues?: ComplianceIssue[];
  txId?: string;
}

export function ReportSummary({ countsBySeverity, report, issues, txId }: ReportSummaryProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { toast } = useToast();
  
  // Calculate counts from issues if countsBySeverity not provided
  const counts = countsBySeverity || (
    issues ? issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<ComplianceIssue['severity'], number>) : {}
  );
  
  // Ensure all severities have a count
  const allSeverities: ComplianceIssue['severity'][] = ['critical', 'high', 'medium', 'low', 'info'];
  allSeverities.forEach(severity => {
    if (!counts[severity]) {
      counts[severity] = 0;
    }
  });

  const severityConfig = {
    critical: { label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-50' },
    high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    medium: { label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    low: { label: 'Low', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    info: { label: 'Info', color: 'text-gray-600', bgColor: 'bg-gray-50' }
  };

  const handleRegenerate = async () => {
    if (!txId || isRegenerating) return;
    
    setIsRegenerating(true);
    try {
      await generateReport({
        txId,
        regenerate: true
      });
      
      toast({
        title: 'Report regenerated',
        description: 'The compliance report has been updated.'
      });
      
      // Reload the page to show new data (only in browser, not tests)
      if (typeof window !== 'undefined' && typeof window.location.reload === 'function') {
        try {
          window.location.reload();
        } catch (e) {
          // Ignore errors in test environment
          console.log('Reload skipped in test environment');
        }
      }
    } catch (error) {
      console.error('Failed to regenerate report:', error);
      toast({
        title: 'Failed to regenerate report',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Compliance Summary</CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Last generated: {report?.updated_at ? format(new Date(report.updated_at), 'MMM d, yyyy h:mm a') : 'Never'}</span>
          </div>
          {txId && (
            <Button 
              onClick={handleRegenerate}
              disabled={isRegenerating}
              size="sm"
              variant="outline"
            >
              {isRegenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" data-testid="regenerate-spinner" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(severityConfig).map(([severity, config]) => {
            const count = counts[severity as ComplianceIssue['severity']] || 0;
            return (
              <div
                key={severity}
                className={`${config.bgColor} rounded-lg p-4 text-center`}
              >
                <div className={`text-2xl font-bold ${config.color}`}>
                  {count}
                </div>
                <div className={`text-sm ${config.color}`}>
                  {count} {config.label}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}