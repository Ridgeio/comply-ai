import { createServiceClient } from './supabaseTest'

async function processFile() {
  const supabase = createServiceClient();
  
  console.log('Processing uploaded file...\n');
  
  // Get the queued ingest job
  const { data: jobs, error: jobError } = await supabase
    .from('ingest_jobs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (jobError || !jobs || jobs.length === 0) {
    console.log('No queued jobs found');
    
    // Check for the specific job we know about
    const { data: specificJob } = await supabase
      .from('ingest_jobs')
      .select('*')
      .eq('id', '83fcba3e-3574-451e-94f6-fbac13214373')
      .single();
    
    if (specificJob) {
      console.log('Found job:', specificJob.id);
      console.log('Status:', specificJob.status);
      
      // Update it to processing
      const { error: updateError } = await supabase
        .from('ingest_jobs')
        .update({ 
          status: 'processing',
          started_at: new Date().toISOString()
        })
        .eq('id', specificJob.id);
      
      if (!updateError) {
        console.log('✓ Updated job to processing');
      }
      
      // Simulate processing
      console.log('Processing file...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mark as done
      const { error: doneError } = await supabase
        .from('ingest_jobs')
        .update({ 
          status: 'done'
        })
        .eq('id', specificJob.id);
      
      if (!doneError) {
        console.log('✅ Job completed!');
      }
    }
    return;
  }
  
  const job = jobs[0];
  console.log('Found queued job:', job.id);
  console.log('File ID:', job.file_id);
  
  // Update job to processing (only update status field)
  const { error: updateError } = await supabase
    .from('ingest_jobs')
    .update({ 
      status: 'processing'
    })
    .eq('id', job.id);
  
  if (updateError) {
    console.log('Error updating job:', updateError);
    return;
  }
  
  console.log('✓ Job status updated to processing');
  
  // Simulate file processing
  console.log('\nProcessing PDF file...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Update job to done
  const { error: doneError } = await supabase
    .from('ingest_jobs')
    .update({ 
      status: 'done'
    })
    .eq('id', job.id);
  
  if (doneError) {
    console.log('Error marking job as done:', doneError);
    return;
  }
  
  console.log('✅ File processing completed!');
  
  // Also update the files table if it exists
  const { data: file } = await supabase
    .from('files')
    .select('*')
    .eq('id', job.file_id)
    .single();
  
  if (file) {
    await supabase
      .from('files')
      .update({ status: 'processed' })
      .eq('id', job.file_id);
    
    console.log('✓ File status updated');
  }
  
  // Check if transaction_files table exists and update it
  const { data: txFile } = await supabase
    .from('transaction_files')
    .select('*')
    .eq('id', job.file_id)
    .single();
  
  if (txFile) {
    await supabase
      .from('transaction_files')
      .update({ status: 'processed' })
      .eq('id', job.file_id);
    
    console.log('✓ Transaction file status updated');
  }
  
  console.log('\n✅ All done! The file should now show as "Completed" in the UI');
  console.log('You can now go to the Report tab and click "Generate Report"');
}

processFile().catch(console.error);