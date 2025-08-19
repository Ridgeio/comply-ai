'use client';

import { AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ComplianceIssue } from '@/src/app/transactions/[txId]/actions/reportActions';

interface VersionWarningProps {
  issues: ComplianceIssue[];
}

export function VersionWarning({ issues }: VersionWarningProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Find version outdated issues
  const versionIssue = issues.find(issue => 
    issue.code === 'trec20.version.outdated' || 
    issue.code === 'trec40.version.outdated' ||
    issue.code === 'trec36.version.outdated' ||
    issue.code === 'trec39.version.outdated'
  );

  if (!versionIssue || isDismissed) {
    return null;
  }

  const expectedVersion = versionIssue.details_json?.expected_version || 'unknown';
  const foundVersion = versionIssue.details_json?.found || 'unknown';

  return (
    <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertTitle className="text-orange-900 dark:text-orange-100">
        Outdated form version detected
      </AlertTitle>
      <AlertDescription className="mt-2 text-orange-800 dark:text-orange-200">
        <div className="flex items-center justify-between">
          <div>
            Expected {expectedVersion}, found {foundVersion}. 
            {' '}
            <Link 
              href="/settings/forms" 
              className="font-medium underline hover:no-underline"
            >
              Settings → Forms
            </Link>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}