'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ComplianceIssue } from '@/src/app/transactions/[txId]/actions/reportActions';

interface ReportSummaryProps {
  countsBySeverity: Record<ComplianceIssue['severity'], number>
}

export function ReportSummary({ countsBySeverity }: ReportSummaryProps) {
  const severityConfig = {
    critical: { label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-50' },
    high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    medium: { label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    low: { label: 'Low', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    info: { label: 'Info', color: 'text-gray-600', bgColor: 'bg-gray-50' }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(severityConfig).map(([severity, config]) => (
            <div
              key={severity}
              className={`${config.bgColor} rounded-lg p-4 text-center`}
            >
              <div className={`text-2xl font-bold ${config.color}`}>
                {countsBySeverity[severity as ComplianceIssue['severity']] || 0}
              </div>
              <div className={`text-sm ${config.color}`}>
                {config.label}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}