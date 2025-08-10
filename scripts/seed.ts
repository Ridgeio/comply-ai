#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables')
  process.exit(1)
}

// Create service role client (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function seed() {
  console.log('🌱 Starting seed process...')

  try {
    // Step 1: Create test users
    console.log('Creating test users...')
    
    // Delete existing test users if they exist
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    for (const user of existingUsers.users) {
      if (user.email === 'agent1@example.com' || user.email === 'agent2@example.com') {
        await supabase.auth.admin.deleteUser(user.id)
        console.log(`  Deleted existing user: ${user.email}`)
      }
    }
    
    // Create agent1
    const { data: agent1Data, error: agent1Error } = await supabase.auth.admin.createUser({
      email: 'agent1@example.com',
      password: 'testpass123',
      email_confirm: true
    })
    
    if (agent1Error) throw agent1Error
    const agent1Id = agent1Data.user.id
    console.log(`  ✓ Created agent1@example.com (${agent1Id})`)
    
    // Create agent2
    const { data: agent2Data, error: agent2Error } = await supabase.auth.admin.createUser({
      email: 'agent2@example.com',
      password: 'testpass123',
      email_confirm: true
    })
    
    if (agent2Error) throw agent2Error
    const agent2Id = agent2Data.user.id
    console.log(`  ✓ Created agent2@example.com (${agent2Id})`)

    // Step 2: Clean up existing test data
    console.log('Cleaning up existing test data...')
    
    // Delete existing test orgs (cascades to all related data)
    await supabase
      .from('organizations')
      .delete()
      .in('name', ['Org A', 'Org B'])
    
    // Step 3: Create organizations
    console.log('Creating organizations...')
    
    const { data: orgA, error: orgAError } = await supabase
      .from('organizations')
      .insert({
        name: 'Org A',
        created_by: agent1Id
      })
      .select()
      .single()
    
    if (orgAError) throw orgAError
    console.log(`  ✓ Created Org A (${orgA.id})`)
    
    const { data: orgB, error: orgBError } = await supabase
      .from('organizations')
      .insert({
        name: 'Org B',
        created_by: agent2Id
      })
      .select()
      .single()
    
    if (orgBError) throw orgBError
    console.log(`  ✓ Created Org B (${orgB.id})`)

    // Step 4: Create memberships
    console.log('Creating memberships...')
    
    const { error: membership1Error } = await supabase
      .from('memberships')
      .insert({
        org_id: orgA.id,
        user_id: agent1Id,
        role: 'agent'
      })
    
    if (membership1Error) throw membership1Error
    console.log(`  ✓ Added agent1 to Org A as 'agent'`)
    
    const { error: membership2Error } = await supabase
      .from('memberships')
      .insert({
        org_id: orgB.id,
        user_id: agent2Id,
        role: 'agent'
      })
    
    if (membership2Error) throw membership2Error
    console.log(`  ✓ Added agent2 to Org B as 'agent'`)

    // Step 5: Create transactions
    console.log('Creating transactions...')
    
    const { data: txA, error: txAError } = await supabase
      .from('transactions')
      .insert({
        org_id: orgA.id,
        title: 'Transaction A1',
        status: 'draft',
        created_by: agent1Id
      })
      .select()
      .single()
    
    if (txAError) throw txAError
    console.log(`  ✓ Created Transaction A1 in Org A (${txA.id})`)
    
    const { data: txB, error: txBError } = await supabase
      .from('transactions')
      .insert({
        org_id: orgB.id,
        title: 'Transaction B1',
        status: 'draft',
        created_by: agent2Id
      })
      .select()
      .single()
    
    if (txBError) throw txBError
    console.log(`  ✓ Created Transaction B1 in Org B (${txB.id})`)

    console.log('\n✅ Seed completed successfully!')
    console.log('\nTest credentials:')
    console.log('  agent1@example.com / testpass123 -> Org A')
    console.log('  agent2@example.com / testpass123 -> Org B')
    
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

// Run the seed
seed()