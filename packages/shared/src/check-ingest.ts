import { createServiceClient } from './supabaseTest'

async function checkIngest() {
  const supabase = createServiceClient();
  
  console.log('Checking ingest_jobs...\n');
  
  // Get the specific job
  const { data: job, error } = await supabase
    .from('ingest_jobs')
    .select('*')
    .eq('id', '83fcba3e-3574-451e-94f6-fbac13214373')
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Job details:');
  console.log(JSON.stringify(job, null, 2));
  
  // Now check if we need to update the transaction_files table
  if (job?.file_id && job?.tx_id) {
    console.log('\nUpdating transaction_files with tx_id...');
    
    const { error: updateError } = await supabase
      .from('transaction_files')
      .update({ tx_id: job.tx_id })
      .eq('id', job.file_id);
    
    if (updateError) {
      console.error('Update error:', updateError);
    } else {
      console.log('✓ Updated transaction_files with transaction_id');
    }
  }
}

checkIngest().catch(console.error);
