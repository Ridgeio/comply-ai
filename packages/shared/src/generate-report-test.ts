import { toRawTrec20 } from '../../parsers/src';
import { createServiceClient } from './supabaseTest';
import { createAdminClient } from './supabase/server';
import { fromRawTrec20, runRules, trec20Rules } from './';
import { readFileSync } from 'fs';
import { join } from 'path';

async function testGenerateReport() {
  const supabase = createServiceClient();
  
  const transactionId = 'ff2a2f75-8011-4794-8887-158c44ec5ed3';
  const fileId = 'e33ab95b-1044-469e-aa24-2fbc987deddb';
  const orgId = '0ba29203-4cef-4cfe-99b2-a180d5832a81';
  
  console.log('Testing report generation...\n');
  
  // Get file metadata
  const { data: file, error: fileError } = await supabase
    .from('transaction_files')
    .select('*')
    .eq('id', fileId)
    .eq('tx_id', transactionId)
    .single();

  if (fileError || !file) {
    console.error('Error fetching file:', fileError);
    return;
  }

  console.log('File found:', file.path);
  
  // Download file from storage
  const storagePath = file.path.startsWith('transactions/') 
    ? file.path.substring('transactions/'.length)
    : file.path;
  
  console.log('Downloading from storage path:', storagePath);
  
  // Use admin client for storage access
  const adminSupabase = await createAdminClient();
  const { data: fileData, error: downloadError } = await adminSupabase
    .storage
    .from('transactions')
    .download(storagePath);

  if (downloadError || !fileData) {
    console.error('Download error:', downloadError);
    return;
  }

  console.log('File downloaded, size:', fileData.size);
  
  try {
    // Convert Blob to Uint8Array
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    console.log('Parsing PDF...');
    // Parse PDF and extract raw data
    const rawData = await toRawTrec20(buffer);
    console.log('PDF parsed successfully');
    
    // Convert to typed model
    const typedData = fromRawTrec20(rawData);
    console.log('Data extracted:', {
      buyerNames: typedData.buyerNames,
      sellerNames: typedData.sellerNames,
      propertyAddress: typedData.propertyAddress,
      formVersion: typedData.formVersion
    });
    
    // Get forms registry
    const { data: formsRegistry } = await supabase
      .from('forms_registry')
      .select('*');
    
    const registry = formsRegistry?.reduce((acc, form) => {
      acc[form.form_code] = form.expected_version;
      return acc;
    }, {} as Record<string, string>) || {};
    
    console.log('Forms registry:', registry);
    
    // Run validation rules
    const issues = runRules(typedData, trec20Rules(registry));
    console.log(`Found ${issues.length} issues`);
    
    // Try to insert report
    const reportData = {
      tx_id: transactionId,
      org_id: orgId,
      file_id: fileId,
      summary: {
        buyerNames: typedData.buyerNames,
        sellerNames: typedData.sellerNames,
        propertyAddress: typedData.propertyAddress,
        formVersion: typedData.formVersion,
        issueCount: issues.length
      },
      metadata: {
        parsedData: typedData,
        formsRegistry: registry
      }
    };
    
    console.log('\nInserting report...');
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert(reportData)
      .select()
      .single();
    
    if (insertError) {
      console.error('Error inserting report:', insertError);
    } else {
      console.log('✓ Report created:', report.id);
      
      // Insert issues
      if (issues.length > 0) {
        const issuesData = issues.map(issue => ({
          report_id: report.id,
          org_id: orgId,
          issue_id: issue.id,
          message: issue.message,
          severity: issue.severity,
          cite: issue.cite,
          data: issue.data
        }));
        
        const { error: issuesError } = await supabase
          .from('issues')
          .insert(issuesData);
        
        if (issuesError) {
          console.error('Error inserting issues:', issuesError);
        } else {
          console.log(`✓ Inserted ${issues.length} issues`);
        }
      }
    }
    
  } catch (error) {
    console.error('Processing error:', error);
  }
}

testGenerateReport().catch(console.error);