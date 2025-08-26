const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function createTestTransaction() {
  console.log('Checking existing transactions...\n');
  
  // Check existing transactions
  const { data: txs, error: txError } = await supabase
    .from('transactions')
    .select('id, title, org_id, status')
    .order('created_at', { ascending: false });
  
  if (txError) {
    console.log('Error fetching transactions:', txError);
    return;
  }
  
  console.log('Current transactions:');
  if (txs && txs.length > 0) {
    txs.forEach(t => {
      console.log(`  ID: ${t.id}`);
      console.log(`     Title: ${t.title}`);
      console.log(`     Status: ${t.status}`);
      console.log(`     URL: http://localhost:3000/transactions/${t.id}\n`);
    });
  } else {
    console.log('  No transactions found');
  }
  
  // Get the first org and user
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name')
    .limit(1)
    .single();
  
  const { data: users } = await supabase.auth.admin.listUsers();
  const firstUser = users?.users?.[0];
  
  if (orgs && firstUser) {
    // Create a new transaction for testing
    const { data: newTx, error } = await supabase
      .from('transactions')
      .insert({
        org_id: orgs.id,
        title: 'Test Property at 456 Elm Street',
        status: 'active',
        created_by: firstUser.id
      })
      .select()
      .single();
    
    if (error) {
      console.log('Error creating transaction:', error);
    } else {
      console.log('\nCreated new transaction:');
      console.log('  ID:', newTx.id);
      console.log('  Title:', newTx.title);
      console.log('  Status:', newTx.status);
      console.log('\n✅ Use this URL: http://localhost:3000/transactions/' + newTx.id);
    }
  } else {
    console.log('\nCould not create transaction - missing org or user');
  }
}

createTestTransaction().catch(console.error);