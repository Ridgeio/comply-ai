#!/usr/bin/env node

/**
 * Database setup script for Comply AI
 * Run with: node scripts/setup-database.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: './apps/web/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function setupDatabase() {
  try {
    console.log('🚀 Setting up database...')
    
    // Create storage bucket
    console.log('📦 Creating storage bucket...')
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('transactions', {
      public: false,
      allowedMimeTypes: ['application/pdf'],
      fileSizeLimit: 20 * 1024 * 1024 // 20MB
    })
    
    if (bucketError && !bucketError.message.includes('already exists')) {
      console.error('Failed to create bucket:', bucketError)
    } else if (bucket) {
      console.log('✅ Storage bucket created')
    } else {
      console.log('✅ Storage bucket already exists')
    }
    
    // Test database connection
    console.log('🔍 Testing database connection...')
    const { data: orgs, error: orgsError } = await supabase
      .from('orgs')
      .select('count')
      .single()
    
    if (orgsError && orgsError.code !== 'PGRST116') {
      console.log('⚠️  Tables might not be set up yet. Please run the migration SQL first.')
      console.log('Go to: https://supabase.com/dashboard/project/zygaagumqbloombllcdk/sql/new')
      console.log('And run the SQL from: supabase/migrations/001_initial_schema.sql')
    } else {
      console.log('✅ Database tables are set up')
      
      // Get or create test data
      console.log('🌱 Setting up test data...')
      
      // Check if we have any users
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
      
      if (users && users.length > 0) {
        const testUser = users[0]
        console.log(`Found user: ${testUser.email} (${testUser.id})`)
        
        // Check if user has an org
        const { data: memberships } = await supabase
          .from('org_members')
          .select('org_id')
          .eq('user_id', testUser.id)
          .limit(1)
        
        if (!memberships || memberships.length === 0) {
          // Create org and membership
          const { data: org, error: orgError } = await supabase
            .from('orgs')
            .insert({ name: 'Test Organization' })
            .select()
            .single()
          
          if (org) {
            await supabase
              .from('org_members')
              .insert({
                org_id: org.id,
                user_id: testUser.id,
                role: 'admin'
              })
            
            // Create sample transactions
            await supabase
              .from('transactions')
              .insert([
                { org_id: org.id, title: '123 Main Street - Purchase Agreement', status: 'active' },
                { org_id: org.id, title: '456 Oak Avenue - Lease Agreement', status: 'draft' },
                { org_id: org.id, title: '789 Pine Road - Sales Contract', status: 'completed' }
              ])
            
            console.log(`✅ Created test organization and transactions for ${testUser.email}`)
          }
        } else {
          console.log('✅ User already has an organization')
        }
      } else {
        console.log('ℹ️  No users found. Sign up through the app first.')
      }
    }
    
    console.log('\n🎉 Setup complete!')
    console.log('You can now run: pnpm dev')
    
  } catch (error) {
    console.error('Setup failed:', error)
    process.exit(1)
  }
}

setupDatabase()