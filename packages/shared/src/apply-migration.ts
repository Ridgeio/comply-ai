// Script to apply migrations to the live database
import { createServiceClient } from './supabaseTest'
import * as fs from 'fs'
import * as path from 'path'

async function applyMigration() {
  const migrationFile = path.resolve(__dirname, '../../../supabase/migrations/0006_fix_rls_recursion.sql');
  const sql = fs.readFileSync(migrationFile, 'utf8');
  
  console.log('Applying migration to fix RLS recursion...\n');
  console.log('Migration file:', migrationFile);
  
  const supabase = createServiceClient();
  
  // Execute the SQL directly
  const { data, error } = await (supabase as any).rpc('exec_sql', { sql });
  
  if (error) {
    // Try a different approach - execute statements one by one
    console.log('Direct execution failed, trying statement by statement...');
    
    // Split SQL into statements (simple split, may need refinement)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.includes('DROP POLICY') || statement.includes('CREATE POLICY')) {
        console.log('\nExecuting:', statement.substring(0, 50) + '...');
        // Note: Supabase doesn't provide direct SQL execution via the JS client
        // We need to use the SQL editor in the Supabase dashboard
      }
    }
    
    console.log('\n❗ Manual action required:');
    console.log('Please execute the following SQL in the Supabase SQL Editor:');
    console.log('1. Go to: https://supabase.com/dashboard/project/zygaagumqbloombllcdk/sql/new');
    console.log('2. Copy and paste the migration from: supabase/migrations/0006_fix_rls_recursion.sql');
    console.log('3. Click "Run" to execute\n');
    
    console.log('Or use this simplified version that just fixes the immediate issue:\n');
    console.log(`-- Fix infinite recursion in org_members RLS policy
DROP POLICY IF EXISTS "Users can view members of their orgs" ON org_members;

CREATE POLICY "Users can view their own memberships only" 
  ON org_members 
  FOR SELECT 
  USING (user_id = auth.uid());`);
    
  } else {
    console.log('Migration applied successfully!');
  }
}

applyMigration().catch(console.error);