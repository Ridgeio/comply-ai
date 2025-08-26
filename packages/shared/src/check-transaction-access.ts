import { createServiceClient } from './supabaseTest';

async function checkTransactionAccess() {
  const supabase = createServiceClient();
  
  const transactionId = 'ff2a2f75-8011-4794-8887-158c44ec5ed3';
  const orgId = '0ba29203-4cef-4cfe-99b2-a180d5832a81'; // NextGen org
  
  console.log('Checking transaction access...\n');
  console.log('Transaction ID:', transactionId);
  console.log('Org ID:', orgId);
  
  // Check if transaction exists and its org_id
  const { data: transaction, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();
  
  if (error) {
    console.error('Error fetching transaction:', error);
  } else {
    console.log('\nTransaction found:');
    console.log('  ID:', transaction.id);
    console.log('  Title:', transaction.title);
    console.log('  Org ID:', transaction.org_id);
    console.log('  Status:', transaction.status);
    
    if (transaction.org_id === orgId) {
      console.log('\n✓ Transaction belongs to NextGen org');
    } else {
      console.log('\n✗ Transaction org mismatch!');
      console.log('  Expected:', orgId);
      console.log('  Got:', transaction.org_id);
    }
  }
  
  // Check org_members for tom@chartingalpha.com
  const { data: members, error: membersError } = await supabase
    .from('org_members')
    .select('*')
    .eq('user_id', 'dd6c6dde-c727-41cf-87f0-d65c965edee3'); // Tom's user ID
  
  if (membersError) {
    console.error('\nError fetching memberships:', membersError);
  } else {
    console.log('\nTom\'s org memberships:');
    members?.forEach(m => {
      console.log(`  - Org: ${m.org_id}, Role: ${m.role}`);
    });
  }
}

checkTransactionAccess().catch(console.error);