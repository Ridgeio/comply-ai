'use server';

import { toRawTrec20 } from '@repo/parsers';
import { createClient, createAdminClient , fromRawTrec20, runRules, trec20Rules } from '@repo/shared';
import type { Database as _Database } from '@repo/shared/types/supabase';

import { insertReport, insertIssues, getUserOrgId, verifyTransactionAccess } from '@/src/lib/db';
import { countBySeverity } from '@/src/lib/severity';

export async function generateReport(transactionId: string, fileId: string) {
  try {
    // Get authenticated user's org
    const supabase = await createClient();
    const orgId = await getUserOrgId(supabase);
    
    if (!orgId) {
      return {
        success: false,
        error: 'User not authenticated or no organization found',
      };
    }

    // Verify user has access to this transaction
    const hasAccess = await verifyTransactionAccess(supabase, transactionId, orgId);
    if (!hasAccess) {
      return {
        success: false,
        error: 'You do not have access to this transaction',
      };
    }

    // Get file metadata
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('transaction_id', transactionId)
      .single();

    if (fileError || !file) {
      return {
        success: false,
        error: 'File not found or does not belong to this transaction',
      };
    }

    // Download file from storage using admin client (bypasses RLS)
    const adminSupabase = await createAdminClient();
    const { data: fileData, error: downloadError } = await adminSupabase
      .storage
      .from('uploads')
      .download(file.storage_path);

    if (downloadError || !fileData) {
      return {
        success: false,
        error: `Failed to download file: ${downloadError?.message || 'Unknown error'}`,
      };
    }

    // Convert Blob to Uint8Array
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Parse PDF and extract raw data
    const rawData = await toRawTrec20(buffer);

    // Convert to typed model
    const typedData = fromRawTrec20(rawData);

    // Run validation rules
    const issues = runRules(typedData, trec20Rules);

    // Prepare report summary
    const summary = {
      buyerNames: typedData.buyerNames,
      sellerNames: typedData.sellerNames,
      propertyAddress: typedData.propertyAddress,
      salesPrice: {
        total: typedData.salesPrice.totalCents / 100,
        cash: typedData.salesPrice.cashPortionCents ? typedData.salesPrice.cashPortionCents / 100 : null,
        financed: typedData.salesPrice.financedPortionCents ? typedData.salesPrice.financedPortionCents / 100 : null,
      },
      effectiveDate: typedData.effectiveDate,
      closingDate: typedData.closingDate,
      formVersion: typedData.formVersion,
      issueCount: issues.length,
      countsBySeverity: countBySeverity(issues),
    };

    // Insert report and issues in a transaction
    // Note: Supabase doesn't support true DB transactions via REST API
    // In production, consider using a Postgres function or Edge Function for atomicity
    
    const report = await insertReport(supabase, {
      transaction_id: transactionId,
      org_id: orgId,
      file_id: fileId,
      summary,
      metadata: {
        parsedData: typedData,
      },
    });

    await insertIssues(supabase, report.id, orgId, issues);

    return {
      success: true,
      reportId: report.id,
      countsBySeverity: countBySeverity(issues),
      issueCount: issues.length,
    };

  } catch (error) {
    console.error('Error generating report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate report',
    };
  }
}