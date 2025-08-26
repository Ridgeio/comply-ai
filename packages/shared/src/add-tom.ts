import { createServiceClient } from './supabaseTest'

async function addTom() {
  const supabase = createServiceClient();
  
  // Hardcoded IDs from our test data
  const orgAId = '9f476210-a775-4795-92eb-a9812f813422';
  
  // Get or create tom@chartingalpha.com
  const { data: users } = await supabase.auth.admin.listUsers();
  let tom = users?.users.find(u => u.email === 'tom@chartingalpha.com');
  
  if (!tom) {
    console.log('Creating user tom@chartingalpha.com...');
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: 'tom@chartingalpha.com',
      password: 'testpass123',
      email_confirm: true
    });
    
    if (error) {
      console.log('Error creating user:', error);
      return;
    }
    tom = newUser.user;
    console.log('Created user with ID:', tom?.id);
  } else {
    console.log('Found user tom@chartingalpha.com, ID:', tom.id);
  }
  
  if (!tom) return;
  
  // Check if Tom is already a member of Org A
  const { data: existing } = await supabase
    .from('org_members')
    .select('*')
    .eq('user_id', tom.id)
    .eq('org_id', orgAId);
  
  console.log('Existing memberships for Tom in Org A:', existing?.length || 0);
  
  if (!existing || existing.length === 0) {
    // Add Tom to Org A
    const { data, error } = await supabase
      .from('org_members')
      .insert({
        id: crypto.randomUUID(),
        org_id: orgAId,
        user_id: tom.id,
        role: 'admin',
        created_at: new Date().toISOString()
      })
      .select();
    
    if (error) {
      console.log('Error adding Tom to org:', error);
    } else {
      console.log('✅ Successfully added tom@chartingalpha.com to Org A!');
      console.log('Membership created:', data);
    }
  } else {
    console.log('✓ Tom is already a member of Org A');
  }
  
  console.log('\n✅ You should now be able to access:');
  console.log('   http://localhost:3000/transactions/60f6871a-38a0-4d35-ab54-f71d892656ba');
}

addTom().catch(console.error);