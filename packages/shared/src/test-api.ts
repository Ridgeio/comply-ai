import { createServiceClient } from './supabaseTest'

async function testAPI() {
  const supabase = createServiceClient();
  
  const transactionId = 'ff2a2f75-8011-4794-8887-158c44ec5ed3';
  
  console.log('Testing file fetch for transaction:', transactionId);
  
  // Check if files exist for this transaction
  const { data: files, error } = await supabase
    .from('transaction_files')
    .select('*')
    .eq('tx_id', transactionId);
  
  if (error) {
    console.error('Error fetching files:', error);
  } else {
    console.log('Files found:', files?.length || 0);
    if (files && files.length > 0) {
      console.log('First file:', {
        id: files[0].id,
        path: files[0].path,
        tx_id: files[0].tx_id
      });
    }
  }
  
  // Check if a report already exists
  const { data: reports, error: reportError } = await supabase
    .from('reports')
    .select('*')
    .eq('transaction_id', transactionId);
  
  if (reportError) {
    console.error('Error checking reports:', reportError);
  } else {
    console.log('\nExisting reports:', reports?.length || 0);
    if (reports && reports.length > 0) {
      console.log('Latest report:', {
        id: reports[0].id,
        created_at: reports[0].created_at
      });
    }
  }
}

testAPI().catch(console.error);