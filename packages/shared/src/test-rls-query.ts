// Test script to debug the RLS query issue
import { createServiceClient, signInAsUser } from './supabaseTest'

async function fixRLSPolicies() {
  console.log('Fixing RLS policies using service client...\n');
  
  try {
    // Use service client to bypass RLS
    const serviceClient = createServiceClient();
    
    // First check current policies
    console.log('Checking current policies on org_members...');
    const { data: policies, error: policyError } = await serviceClient.rpc('query_policies', {
      table_name: 'org_members'
    }).single();
    
    if (policyError) {
      console.log('Could not query policies via RPC');
      
      // Try a different approach - just test if we can query the table
      const { data: testQuery, error: testError } = await serviceClient
        .from('org_members')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.log('Error querying org_members:', testError.message);
      } else {
        console.log('Service client can query org_members successfully');
      }
    }
    
    // Now test as a regular user to see if the issue persists
    console.log('\nTesting as agent1...');
    const { client } = await signInAsUser('agent1@example.com', 'testpass123');
    console.log('Successfully signed in as agent1@example.com');
    
    // Try the exact query from the test
    console.log('\nExecuting query: transactions.select("id, org_id, title")');
    const { data: transactions, error } = await client
      .from('transactions')
      .select('id, org_id, title');
    
    if (error) {
      console.log('\nError occurred:');
      console.log('  Code:', error.code);
      console.log('  Message:', error.message);
      
      if (error.code === '42P17' || error.message?.includes('infinite recursion')) {
        console.log('\n❌ INFINITE RECURSION DETECTED!');
        console.log('\nThe RLS policies need to be fixed in the Supabase Dashboard.');
        console.log('Please go to: https://supabase.com/dashboard/project/zygaagumqbloombllcdk/sql/new');
        console.log('\nRun this SQL:\n');
        console.log(`-- Fix infinite recursion in RLS policies
-- Drop the problematic recursive policy on org_members
DROP POLICY IF EXISTS "Users can view members of their orgs" ON org_members;

-- Create a simpler non-recursive policy for org_members
DROP POLICY IF EXISTS "Users can view their own memberships only" ON org_members;
CREATE POLICY "Users can view their own memberships only" 
  ON org_members 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Fix transaction policies to avoid recursion
DROP POLICY IF EXISTS "Users can view their org transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions in their orgs" ON transactions;

-- Recreate transaction policies without recursion
CREATE POLICY "Users can view their org transactions" 
  ON transactions 
  FOR SELECT 
  USING (
    org_id IN (
      SELECT org_id 
      FROM org_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transactions in their orgs" 
  ON transactions 
  FOR INSERT 
  WITH CHECK (
    org_id IN (
      SELECT org_id 
      FROM org_members 
      WHERE user_id = auth.uid()
    )
  );

-- Check the result
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('org_members', 'transactions')
ORDER BY tablename, policyname;`);
      }
    } else {
      console.log('\n✅ Query successful!');
      console.log('Transactions found:', transactions?.length);
      console.log('Data:', transactions);
    }
  } catch (err) {
    console.error('Caught error:', err);
  }
}

fixRLSPolicies().catch(console.error);