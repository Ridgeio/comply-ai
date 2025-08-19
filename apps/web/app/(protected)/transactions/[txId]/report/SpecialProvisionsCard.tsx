import { AlertCircle, FileText } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ComplianceIssue } from '@/src/app/transactions/[txId]/actions/reportActions';

interface SpecialProvisionsCardProps {
  issue: ComplianceIssue | undefined;
}

export function SpecialProvisionsCard({ issue }: SpecialProvisionsCardProps) {
  if (!issue || !issue.code.includes('special_provisions')) {
    return null;
  }

  const details = issue.details_json as {
    summary?: string;
    reasons?: string[];
    hints?: string[];
    classification?: 'none' | 'caution' | 'review';
  } | undefined;

  if (!details) {
    return null;
  }

  // Determine badge variant and label based on severity or classification
  const getBadgeInfo = () => {
    if (details.classification) {
      switch (details.classification) {
        case 'review':
          return { variant: 'destructive' as const, label: 'Review' };
        case 'caution':
          return { variant: 'default' as const, label: 'Caution' };
        case 'none':
          return { variant: 'secondary' as const, label: 'None' };
      }
    }
    
    // Fall back to severity-based classification
    switch (issue.severity) {
      case 'critical':
      case 'high':
        return { variant: 'destructive' as const, label: 'Review' };
      case 'medium':
        return { variant: 'default' as const, label: 'Caution' };
      default:
        return { variant: 'secondary' as const, label: 'None' };
    }
  };

  const { variant, label } = getBadgeInfo();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Paragraph 11 — Special Provisions
          </CardTitle>
          <Badge variant={variant}>{label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {details.summary && (
          <div className="text-sm text-muted-foreground">
            {details.summary}
          </div>
        )}

        {details.reasons && details.reasons.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Identified Concerns:</h4>
            <ul className="list-disc list-inside space-y-1">
              {details.reasons.map((reason, idx) => (
                <li key={idx} className="text-sm text-muted-foreground">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {details.hints && details.hints.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Pattern Matches:</h4>
            <div className="flex flex-wrap gap-2">
              {details.hints.map((hint, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {hint}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This is an AI-generated analysis. Please review the special provisions 
            carefully and consult with a qualified professional if needed.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}