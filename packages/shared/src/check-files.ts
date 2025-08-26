import { createServiceClient } from './supabaseTest'

async function checkFiles() {
  const supabase = createServiceClient();
  
  console.log('Checking files table...\n');
  
  // Get all files
  const { data: files, error } = await supabase
    .from('transaction_files')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${files?.length || 0} files:\n`);
  
  files?.forEach(file => {
    console.log(`ID: ${file.id}`);
    console.log(`Transaction (tx_id): ${file.tx_id}`);
    console.log(`Path: ${file.path}`);
    console.log(`Kind: ${file.kind}`);
    console.log(`Org ID: ${file.org_id}`);
    console.log(`Created: ${file.created_at}`);
    console.log('---');
  });
}

checkFiles().catch(console.error);