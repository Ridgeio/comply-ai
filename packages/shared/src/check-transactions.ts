import { createServiceClient } from './supabaseTest'

async function checkTransactions() {
  const supabase = createServiceClient();
  
  console.log('Checking all transactions...\n');
  
  // Get all transactions
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${transactions?.length || 0} transactions:\n`);
  
  transactions?.forEach(tx => {
    console.log(`ID: ${tx.id}`);
    console.log(`Title: ${tx.title}`);
    console.log(`Org ID: ${tx.org_id}`);
    console.log(`Created: ${tx.created_at}`);
    console.log('---');
  });
}

checkTransactions().catch(console.error);