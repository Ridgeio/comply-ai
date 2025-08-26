'use client';

import type { Issue } from '@repo/shared';
import { 
  RefreshCw, 
  Download, 
  Copy, 
  FileText, 
  Loader2,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { IssuesTable } from './IssuesTable';
import { ReportSummary } from './ReportSummary';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fetchReport } from '@/src/app/transactions/[txId]/actions/fetchReport';
import { generateReport } from '@/src/app/transactions/[txId]/actions/generateReport';


export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params.txId as string;

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [generatedAt, setGeneratedAt] = useState<Date>(new Date());

  useEffect(() => {
    loadReport();
  }, [transactionId]);

  const loadReport = async () => {
    setLoading(true);
    setError(null);

    const result = await fetchReport(transactionId);

    if (result.success && result.report) {
      setIssues(result.issues);
      setReportData(result.report);
      setGeneratedAt(new Date(result.report.createdAt));
    } else if (result.error === 'No report found for this transaction') {
      // No report yet - this is ok
      setIssues([]);
      setReportData(null);
    } else {
      setError(result.error || 'Failed to load report');
    }

    setLoading(false);
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    setError(null);

    try {
      console.log('Starting report generation for transaction:', transactionId);
      
      // Get the first file for this transaction
      const response = await fetch(`/api/transactions/${transactionId}/files`);
      const { data: files, error: filesError } = await response.json();
      
      console.log('Files API response:', { files, filesError });
      
      if (filesError || !files || files.length === 0) {
        setError('No files found for this transaction. Please upload a file first.');
        setGenerating(false);
        return;
      }

      const fileId = files[0].id;
      console.log('Using file ID:', fileId);
      
      const result = await generateReport(transactionId, fileId);
      console.log('Generate report result:', result);

      if (result.success) {
        console.log('Report generated successfully, reloading...');
        // Reload the report
        await loadReport();
      } else {
        console.error('Report generation failed:', result.error);
        setError(result.error || 'Failed to generate report');
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report. Please try again.');
    }

    setGenerating(false);
  };

  const handleDownloadJSON = () => {
    const exportData = {
      report: reportData,
      issues,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${transactionId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyShareLink = async () => {
    // TODO: Implement signed URL generation
    const url = `${window.location.origin}/shared/report/${transactionId}`;
    await navigator.clipboard.writeText(url);
    // You'd typically show a toast here
    alert('Share link copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/transactions/${transactionId}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Transaction
          </Button>
          <h1 className="text-2xl font-bold">Document Validation Report</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyShareLink}
            disabled={!reportData}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Share Link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadJSON}
            disabled={!reportData}
          >
            <Download className="w-4 h-4 mr-2" />
            Download JSON
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={generating}
            size="sm"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {reportData ? 'Regenerate' : 'Generate'} Report
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* No Report Message */}
      {!reportData && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Report Generated</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a report to validate your documents
            </p>
            <Button onClick={handleGenerateReport} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Report Content */}
      {reportData && (
        <>
          <ReportSummary issues={issues} generatedAt={generatedAt} />
          <IssuesTable issues={issues} />
        </>
      )}
    </div>
  );
}