#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestTransaction() {
  console.log('🧪 Creating test transaction...\n')

  try {
    // Get the first test user (agent1)
    const { data: users } = await supabase.auth.admin.listUsers()
    const agent1 = users.users.find(u => u.email === 'agent1@example.com')
    
    if (!agent1) {
      console.error('❌ Test user agent1@example.com not found. Run seed script first.')
      return
    }

    // Get Org A
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('name', 'Org A')
      .single()
    
    if (!orgs) {
      console.error('❌ Org A not found. Run seed script first.')
      return
    }

    // Create a new transaction for testing
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        org_id: orgs.id,
        title: 'Test Upload Transaction',
        status: 'active',
        created_by: agent1.id
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Failed to create transaction:', error)
      return
    }

    console.log('✅ Created test transaction:')
    console.log(`   ID: ${transaction.id}`)
    console.log(`   Title: ${transaction.title}`)
    console.log(`   Org: ${orgs.name}`)
    console.log('\n📋 Next steps:')
    console.log(`1. Start the dev server: pnpm dev --filter @app/web`)
    console.log(`2. Visit: http://localhost:3000/transactions/${transaction.id}/upload`)
    console.log(`3. Upload a test PDF file`)
    console.log(`4. Check the transaction page: http://localhost:3000/transactions/${transaction.id}`)
    console.log('\nTest credentials:')
    console.log('   Email: agent1@example.com')
    console.log('   Password: testpass123')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

createTestTransaction()