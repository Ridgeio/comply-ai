import { createServiceClient } from './supabaseTest'

async function fixTomAccess() {
  const supabase = createServiceClient();
  
  // Get tom's user
  const { data: users } = await supabase.auth.admin.listUsers();
  const tom = users?.users.find(u => u.email === 'tom@chartingalpha.com');
  
  if (!tom) {
    console.log('Tom not found');
    return;
  }
  
  console.log('Tom\'s user ID:', tom.id);
  
  // Check Tom's org memberships
  const { data: memberships } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', tom.id);
  
  console.log('\nTom\'s current org memberships:');
  for (const m of memberships || []) {
    const { data: org } = await supabase
      .from('orgs')
      .select('name')
      .eq('id', m.org_id)
      .single();
    console.log('  -', org?.name || m.org_id, '(role:', m.role + ')');
  }
  
  // Check all orgs
  const { data: allOrgs } = await supabase.from('orgs').select('id, name');
  
  console.log('\nAll organizations:');
  allOrgs?.forEach(o => console.log('  -', o.name, '(ID:', o.id + ')'));
  
  // Add Tom to NextGen org if not already a member
  const nextgenOrg = allOrgs?.find(o => o.name === 'NextGen');
  if (nextgenOrg) {
    const existing = memberships?.find(m => m.org_id === nextgenOrg.id);
    if (!existing) {
      console.log('\nAdding Tom to NextGen org...');
      const { error } = await supabase
        .from('org_members')
        .insert({
          org_id: nextgenOrg.id,
          user_id: tom.id,
          role: 'admin'
        });
      
      if (error) {
        console.log('Error:', error.message);
      } else {
        console.log('✅ Added Tom to NextGen!');
      }
    } else {
      console.log('\n✓ Tom is already a member of NextGen');
    }
  }
  
  // Check transactions by org
  console.log('\nTransactions by organization:');
  for (const org of allOrgs || []) {
    const { data: txs } = await supabase
      .from('transactions')
      .select('id, title, status')
      .eq('org_id', org.id);
    
    console.log('\n' + org.name + ':');
    if (txs && txs.length > 0) {
      txs.forEach(t => {
        console.log('  -', t.title);
        console.log('    Status:', t.status);
        console.log('    URL: http://localhost:3000/transactions/' + t.id);
      });
    } else {
      console.log('  No transactions');
    }
  }
  
  // Create a transaction in NextGen org if it doesn't have any
  if (nextgenOrg) {
    const { data: nextgenTxs } = await supabase
      .from('transactions')
      .select('id')
      .eq('org_id', nextgenOrg.id);
    
    if (!nextgenTxs || nextgenTxs.length === 0) {
      console.log('\nCreating transaction in NextGen org...');
      const { data: newTx, error } = await supabase
        .from('transactions')
        .insert({
          org_id: nextgenOrg.id,
          title: 'NextGen Test Property',
          status: 'active',
          created_by: tom.id
        })
        .select()
        .single();
      
      if (error) {
        console.log('Error creating transaction:', error.message);
      } else {
        console.log('✅ Created transaction:', newTx.title);
        console.log('   URL: http://localhost:3000/transactions/' + newTx.id);
      }
    }
  }
  
  console.log('\n✅ Access setup complete!');
  console.log('You can now:');
  console.log('1. Switch to "Org A" in the org switcher to see those transactions');
  console.log('2. Or stay in "NextGen" to see NextGen transactions');
}

fixTomAccess().catch(console.error);