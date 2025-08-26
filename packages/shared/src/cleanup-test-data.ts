import { createServiceClient } from './supabaseTest'

async function cleanup() {
  const service = createServiceClient();
  
  console.log('Cleaning up extra test data...');
  
  // Delete the extra test upload transaction
  const { error } = await service
    .from('transactions')
    .delete()
    .eq('title', 'Test Upload Transaction');
  
  if (error) {
    console.log('Error deleting:', error);
  } else {
    console.log('✓ Deleted Test Upload Transaction');
  }
  
  // Also delete the NextGen org transaction
  const { error: error2 } = await service
    .from('transactions')
    .delete()
    .eq('title', '123 Oak St.');
  
  if (!error2) {
    console.log('✓ Deleted 123 Oak St. transaction');
  }
  
  // Verify what's left
  const { data: remaining } = await service
    .from('transactions')
    .select('title, org_id')
    .order('created_at');
  
  console.log('\nRemaining transactions:');
  remaining?.forEach(t => console.log('  -', t.title));
}

cleanup().catch(console.error);