// Script to check the live database schema
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  console.log('Checking database schema...\n');

  // Check if auth.uid() function exists
  const { data: authFunc, error: authFuncError } = await supabase.rpc('pg_proc', {
    proname: 'uid',
    pronamespace: 'auth'
  }).single();

  if (authFuncError) {
    console.log('Error checking auth.uid():', authFuncError.message);
  } else {
    console.log('auth.uid() function exists:', !!authFunc);
  }

  // Check tables
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', ['organizations', 'memberships', 'transactions', 'orgs', 'org_members']);

  if (!tablesError) {
    console.log('\nTables found in public schema:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));
  }

  // Check for test users
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (!usersError) {
    const testUsers = users.users.filter(u => 
      u.email === 'agent1@example.com' || u.email === 'agent2@example.com'
    );
    console.log('\nTest users found:', testUsers.length);
    testUsers.forEach(u => console.log(`  - ${u.email} (${u.id})`));
  }

  // Check if there are any organizations
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name')
    .limit(5);

  if (orgsError) {
    console.log('\nError querying organizations:', orgsError.message);
    
    // Try the other table name
    const { data: orgs2, error: orgs2Error } = await supabase
      .from('orgs')
      .select('id, name')
      .limit(5);
      
    if (!orgs2Error) {
      console.log('\nFound orgs table (not organizations):');
      console.log('Sample orgs:', orgs2);
    }
  } else {
    console.log('\nSample organizations:', orgs);
  }
}

checkDatabase().catch(console.error);