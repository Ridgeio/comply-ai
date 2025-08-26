// Script to fix RLS policies via direct PostgreSQL connection
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Parse the Supabase database URL - use direct connection
const dbUrl = `postgresql://postgres:${process.env.SUPABASE_DATABASE_PASSWORD}@db.zygaagumqbloombllcdk.supabase.co:5432/postgres`;

async function fixRLSPolicies() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!\n');

    // First, check which policies exist
    const checkPolicies = `
      SELECT schemaname, tablename, policyname 
      FROM pg_policies 
      WHERE tablename IN ('org_members', 'transactions', 'memberships')
      ORDER BY tablename, policyname;
    `;
    
    const result = await client.query(checkPolicies);
    console.log('Current policies:');
    result.rows.forEach(row => {
      console.log(`  ${row.tablename}: ${row.policyname}`);
    });

    console.log('\nFixing RLS policies...\n');

    // Fix org_members policy if it exists
    const fixes = [
      `DROP POLICY IF EXISTS "Users can view members of their orgs" ON org_members`,
      `CREATE POLICY IF NOT EXISTS "Users can view their own memberships only" 
       ON org_members 
       FOR SELECT 
       USING (user_id = auth.uid())`,
    ];

    for (const sql of fixes) {
      try {
        console.log(`Executing: ${sql.substring(0, 60)}...`);
        await client.query(sql);
        console.log('  ✓ Success');
      } catch (err) {
        console.log(`  ✗ Error: ${err.message}`);
      }
    }

    console.log('\nPolicies fixed successfully!');

  } catch (err) {
    console.error('Database error:', err.message);
  } finally {
    await client.end();
  }
}

fixRLSPolicies().catch(console.error);