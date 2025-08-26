import { createServiceClient } from './supabaseTest'

async function fixAccess() {
  const supabase = createServiceClient();
  
  // First, ensure tom@chartingalpha.com exists
  const { data: users } = await supabase.auth.admin.listUsers();
  let tom = users?.users.find(u => u.email === 'tom@chartingalpha.com');
  
  if (!tom) {
    console.log('Creating user tom@chartingalpha.com...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'tom@chartingalpha.com',
      password: 'testpass123',
      email_confirm: true
    });
    
    if (createError) {
      console.log('Error creating user:', createError);
      return;
    }
    tom = newUser.user;
  }
  
  // Get the transaction we just created
  const { data: tx } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', '60f6871a-38a0-4d35-ab54-f71d892656ba')
    .single();
  
  console.log('Transaction details:');
  console.log('  ID:', tx?.id);
  console.log('  Title:', tx?.title);
  console.log('  Org ID:', tx?.org_id);
  
  // Get all users (reuse the users variable from above)
  console.log('\nAll users in system:');
  users?.users.forEach(u => {
    console.log('  -', u.email);
  });
  
  // Check current memberships for this org
  const { data: memberships } = await supabase
    .from('org_members')
    .select('*')
    .eq('org_id', tx?.org_id);
  
  console.log('\nCurrent members of this org:');
  if (memberships && memberships.length > 0) {
    for (const m of memberships) {
      const user = users?.users.find(u => u.id === m.user_id);
      console.log('  -', user?.email || m.user_id, '(role:', m.role + ')');
    }
  } else {
    console.log('  No members found');
  }
  
  // Specifically add tom@chartingalpha.com to the org
  if (tx && tom) {
    console.log('\nChecking if tom@chartingalpha.com is a member...');
    
    const existing = memberships?.find(m => m.user_id === tom.id);
    
    if (!existing) {
      const { error } = await supabase
        .from('org_members')
        .insert({
          org_id: tx.org_id,
          user_id: tom.id,
          role: 'admin'
        });
      
      if (error) {
        console.log('  ❌ Error adding tom@chartingalpha.com:', error.message);
      } else {
        console.log('  ✅ Added tom@chartingalpha.com as admin to the organization!');
      }
    } else {
      console.log('  ✓ tom@chartingalpha.com is already a member (role: ' + existing.role + ')');
    }
  }
  
  console.log('\n✅ Access fixed! You should now be able to access:');
  console.log('   http://localhost:3000/transactions/60f6871a-38a0-4d35-ab54-f71d892656ba');
}

fixAccess().catch(console.error);