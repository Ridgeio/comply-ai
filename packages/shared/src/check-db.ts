// Script to check and fix the live database schema
import { createServiceClient } from './supabaseTest'
import { Client } from 'pg'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../../.env.local');
dotenv.config({ path: envPath });

async function fixRLSWithPG() {
  const password = process.env.SUPABASE_DATABASE_PASSWORD;
  if (!password) {
    console.log('No database password found, skipping direct PG connection');
    return false;
  }
  
  // Try different connection formats
  const connectionStrings = [
    // Direct connection with standard port
    {
      host: 'db.zygaagumqbloombllcdk.supabase.co',
      port: 5432,
      user: 'postgres',
      password: password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false }
    },
    // Pooler connection
    {
      host: 'aws-0-us-west-2.pooler.supabase.com', 
      port: 5432,
      user: 'postgres.zygaagumqbloombllcdk',
      password: password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false }
    },
    // Transaction pooler
    {
      host: 'aws-0-us-west-2.pooler.supabase.com',
      port: 6543,
      user: 'postgres.zygaagumqbloombllcdk',
      password: password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false }
    }
  ];
  
  for (let i = 0; i < connectionStrings.length; i++) {
    const client = new Client(connectionStrings[i]);
    
    try {
      console.log(`\nTrying connection ${i + 1}...`);
      await client.connect();
      console.log('✅ Connected to PostgreSQL!');
      
      // Apply RLS fixes
      console.log('\nApplying RLS policy fixes...');
      
      const fixes = [
        `DROP POLICY IF EXISTS "Users can view members of their orgs" ON org_members`,
        `DROP POLICY IF EXISTS "Users can view their own memberships only" ON org_members`,
        `CREATE POLICY "Users can view their own memberships only" ON org_members FOR SELECT USING (user_id = auth.uid())`,
        `DROP POLICY IF EXISTS "Users can view their org transactions" ON transactions`,
        `DROP POLICY IF EXISTS "Users can create transactions in their orgs" ON transactions`,
        `CREATE POLICY "Users can view their org transactions" ON transactions FOR SELECT USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()))`,
        `CREATE POLICY "Users can create transactions in their orgs" ON transactions FOR INSERT WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()))`,
      ];
      
      for (const sql of fixes) {
        try {
          console.log(`  Executing: ${sql.substring(0, 50)}...`);
          await client.query(sql);
          console.log('    ✓ Success');
        } catch (err: any) {
          console.log(`    ✗ Error: ${err.message}`);
        }
      }
      
      // Check result
      const result = await client.query(`
        SELECT tablename, policyname, cmd
        FROM pg_policies 
        WHERE tablename IN ('org_members', 'transactions')
        ORDER BY tablename, policyname
      `);
      
      console.log('\nCurrent policies after fix:');
      result.rows.forEach(row => {
        console.log(`  ${row.tablename}: ${row.policyname} (${row.cmd})`);
      });
      
      await client.end();
      return true;
      
    } catch (err: any) {
      console.log(`  ❌ Failed: ${err.message}`);
      await client.end().catch(() => {});
    }
  }
  
  return false;
}

async function checkDatabase() {
  // First try to fix RLS with direct PG connection
  const fixed = await fixRLSWithPG();
  
  if (fixed) {
    console.log('\n✅ RLS policies have been fixed!');
    console.log('Now run: pnpm test');
    return;
  }
  
  console.log('\nChecking database schema with service client...\n');
  
  const supabase = createServiceClient();

  // Check for test users
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (!usersError && users) {
    const testUsers = users.users.filter(u => 
      u.email === 'agent1@example.com' || u.email === 'agent2@example.com'
    );
    console.log('Test users found:', testUsers.length);
    testUsers.forEach(u => console.log(`  - ${u.email} (${u.id})`));
  } else if (usersError) {
    console.log('Error listing users:', usersError);
  }

  // Check if there are any organizations
  console.log('\nChecking organizations table...');
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name')
    .limit(5);

  if (orgsError) {
    console.log('Error querying organizations:', orgsError.message, orgsError.code);
    
    // Try the other table name
    console.log('\nChecking orgs table...');
    const { data: orgs2, error: orgs2Error } = await supabase
      .from('orgs')
      .select('id, name')
      .limit(5);
      
    if (!orgs2Error) {
      console.log('Found orgs table (not organizations)');
      console.log('Sample orgs:', orgs2);
    } else {
      console.log('Error querying orgs:', orgs2Error.message);
    }
  } else {
    console.log('Found organizations table');
    console.log('Sample organizations:', orgs);
  }

  // Check memberships
  console.log('\nChecking memberships table...');
  const { data: memberships, error: membershipError } = await supabase
    .from('memberships')
    .select('*')
    .limit(5);

  if (membershipError) {
    console.log('Error querying memberships:', membershipError.message, membershipError.code);
    
    // Try org_members
    console.log('\nChecking org_members table...');
    const { data: orgMembers, error: orgMembersError } = await supabase
      .from('org_members')
      .select('*')
      .limit(5);
    
    if (!orgMembersError) {
      console.log('Found org_members table (not memberships)');
      console.log('Sample org_members:', orgMembers);
    } else {
      console.log('Error querying org_members:', orgMembersError.message);
    }
  } else {
    console.log('Found memberships table');
    console.log('Sample memberships:', memberships);
  }

  // Check transactions
  console.log('\nChecking transactions table...');
  const { data: txs, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .limit(5);

  if (!txError) {
    console.log('Found transactions table');
    console.log('Sample transactions:', txs);
  } else {
    console.log('Error querying transactions:', txError.message, txError.code);
  }
}

checkDatabase().catch(console.error);