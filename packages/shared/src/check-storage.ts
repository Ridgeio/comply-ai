import { createServiceClient } from './supabaseTest';

async function checkStorage() {
  const adminSupabase = createServiceClient();
  
  console.log('Checking storage buckets...\n');
  
  // List buckets
  const { data: buckets, error: bucketsError } = await adminSupabase
    .storage
    .listBuckets();
  
  if (bucketsError) {
    console.error('Error listing buckets:', bucketsError);
  } else {
    console.log('Available buckets:', buckets?.map(b => b.name));
  }
  
  // Try to list files at root of transactions bucket
  const { data: rootFiles, error: rootError } = await adminSupabase
    .storage
    .from('transactions')
    .list('', {
      limit: 100
    });
  
  if (rootError) {
    console.error('\nError listing root files:', rootError);
  } else {
    console.log('\nAll files in bucket:', rootFiles?.length || 0);
    rootFiles?.forEach(file => {
      console.log(' -', file.name);
    });
  }
  
  // Try to list files in transactions bucket
  const { data: files, error: listError } = await adminSupabase
    .storage
    .from('transactions')
    .list('0ba29203-4cef-4cfe-99b2-a180d5832a81', {
      limit: 10
    });
  
  if (listError) {
    console.error('\nError listing files:', listError);
  } else {
    console.log('\nFiles in org folder:', files?.length || 0);
    files?.forEach(file => {
      console.log(' -', file.name);
    });
  }
  
  // Try the full path
  const fullPath = '0ba29203-4cef-4cfe-99b2-a180d5832a81/ff2a2f75-8011-4794-8887-158c44ec5ed3/2025/08/25';
  const { data: deepFiles, error: deepError } = await adminSupabase
    .storage
    .from('transactions')
    .list(fullPath, {
      limit: 10
    });
  
  if (deepError) {
    console.error('\nError listing files in full path:', deepError);
  } else {
    console.log(`\nFiles in ${fullPath}:`, deepFiles?.length || 0);
    deepFiles?.forEach(file => {
      console.log(' -', file.name);
    });
  }
}

checkStorage().catch(console.error);