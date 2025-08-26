'use server';

import { toRawTrec20 } from '@repo/parsers';
import { fromRawTrec20, runRules, trec20Rules } from '@repo/shared';
import type { Database as _Database } from '@repo/shared/types/supabase';

import { createAdminClient } from '@/src/lib/supabaseAdmin';
import { supabaseServer } from '@/src/lib/supabaseServer';
import { insertReport, insertIssues, verifyTransactionAccess } from '@/src/lib/db';
import { countBySeverity } from '@/src/lib/severity';
import { requireCurrentOrg } from '@/src/lib/org';

export async function generateReport(transactionId: string, fileId: string) {
  console.log('[generateReport] Starting report generation', {
    transactionId,
    fileId,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Get authenticated user's org
    console.log('[generateReport] Getting current org...');
    const orgId = await requireCurrentOrg();
    console.log('[generateReport] Got org ID:', orgId);
    
    // Create Supabase client for database queries (with auth context)
    const supabase = supabaseServer();
    console.log('[generateReport] Created Supabase server client');
    
    // Debug: Check what user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[generateReport] Authenticated user:', { 
      userId: user?.id, 
      email: user?.email,
      authError 
    });

    // Verify user has access to this transaction
    console.log('[generateReport] Verifying transaction access for:', {
      transactionId,
      orgId,
      userId: user?.id
    });
    
    const hasAccess = await verifyTransactionAccess(supabase, transactionId, orgId);
    console.log('[generateReport] Has access:', hasAccess);
    
    if (!hasAccess) {
      // Debug: Let's see what the actual transaction org is
      const { data: txData } = await supabase
        .from('transactions')
        .select('org_id')
        .eq('id', transactionId)
        .single();
      
      console.log('[generateReport] Transaction actual org_id:', txData?.org_id);
      console.log('[generateReport] User org_id:', orgId);
      
      return {
        success: false,
        error: 'You do not have access to this transaction',
      };
    }

    // Get file metadata
    console.log('[generateReport] Fetching file metadata from transaction_files');
    const { data: file, error: fileError } = await supabase
      .from('transaction_files')
      .select('*')
      .eq('id', fileId)
      .eq('tx_id', transactionId)
      .single();
    console.log('[generateReport] File query result:', { file, fileError });

    if (fileError || !file) {
      return {
        success: false,
        error: 'File not found or does not belong to this transaction',
      };
    }

    // Download file from storage using admin client (bypasses RLS)
    // The path in DB includes 'transactions/' prefix but the bucket is named 'transactions'
    // So we need to remove the prefix
    const storagePath = file.path.startsWith('transactions/') 
      ? file.path.substring('transactions/'.length)
      : file.path;
    
    console.log('[generateReport] Storage path:', storagePath);
    console.log('[generateReport] Creating admin Supabase client');
    const adminSupabase = createAdminClient();
    console.log('[generateReport] Downloading file from storage');
    const { data: fileData, error: downloadError } = await adminSupabase
      .storage
      .from('transactions')
      .download(storagePath);
    console.log('[generateReport] Download result:', { 
      success: !!fileData, 
      error: downloadError,
      fileSize: fileData?.size 
    });

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
    console.log('[generateReport] Parsing PDF with toRawTrec20');
    
    let parseResult;
    try {
      // Try to extract form fields without OCR
      parseResult = await toRawTrec20(buffer);
    } catch (error) {
      console.error('[generateReport] PDF parsing failed:', error);
      
      // Check if this PDF needs OCR
      if (error instanceof Error && error.message.includes('OCR provider not configured')) {
        return {
          success: false,
          error: 'This PDF requires OCR to extract data. The document appears to be a scanned image or non-fillable PDF. Please upload a fillable PDF form or configure OCR processing.',
        };
      }
      
      throw error;
    }
    
    console.log('[generateReport] PDF parsed, result keys:', Object.keys(parseResult));
    console.log('[generateReport] Extraction mode:', parseResult.meta?.mode);

    // Convert to typed model - fromRawTrec20 expects just the raw data
    console.log('[generateReport] Converting to typed model');
    const typedData = fromRawTrec20(parseResult.raw);
    console.log('[generateReport] Typed data extracted:', {
      buyerNames: typedData.buyerNames,
      sellerNames: typedData.sellerNames,
      formVersion: typedData.formVersion
    });

    // Get forms registry from database
    const { data: formsRegistry } = await supabase
      .from('forms_registry')
      .select('*');
    
    const registry = formsRegistry?.reduce((acc, form) => {
      acc[form.form_code] = form.expected_version;
      return acc;
    }, {} as Record<string, string>) || {};

    // Run validation rules
    console.log('[generateReport] Running validation rules');
    const issues = runRules(typedData, trec20Rules(registry));
    console.log('[generateReport] Validation complete, found', issues.length, 'issues');

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
    
    console.log('[generateReport] Inserting report into database');
    const report = await insertReport(supabase, {
      transaction_id: transactionId,
      org_id: orgId,
      file_id: fileId,
      summary,
      metadata: {
        parsedData: typedData,
        formsRegistry: registry,
      },
    });
    console.log('[generateReport] Report inserted with ID:', report.id);

    // Insert issues
    console.log('[generateReport] Inserting', issues.length, 'issues');
    await insertIssues(supabase, report.id, orgId, issues);
    console.log('[generateReport] Issues inserted successfully');

    return {
      success: true,
      reportId: report.id,
      countsBySeverity: countBySeverity(issues),
      issueCount: issues.length,
    };

  } catch (error) {
    console.error('[generateReport] Error generating report:', error);
    console.error('[generateReport] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate report',
    };
  }
}