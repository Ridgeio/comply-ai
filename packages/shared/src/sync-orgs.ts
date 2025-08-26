import { createServiceClient } from './supabaseTest'

async function syncOrgs() {
  const supabase = createServiceClient();
  
  console.log('Syncing organization tables...\n');
  
  // Check what's in organizations
  const { data: organizations } = await supabase
    .from('organizations')
    .select('*');
  
  console.log('Organizations table has', organizations?.length || 0, 'records');
  organizations?.forEach(o => console.log('  -', o.name, '(ID:', o.id + ')'));
  
  // Check what's in orgs
  const { data: orgs } = await supabase
    .from('orgs')
    .select('*');
  
  console.log('\nOrgs table has', orgs?.length || 0, 'records');
  orgs?.forEach(o => console.log('  -', o.name, '(ID:', o.id + ')'));
  
  // Copy missing organizations to orgs
  if (organizations && organizations.length > 0) {
    console.log('\nSyncing missing organizations to orgs table...');
    
    for (const org of organizations) {
      // Check if already exists in orgs
      const existing = orgs?.find(o => o.id === org.id);
      
      if (!existing) {
        const { error } = await supabase
          .from('orgs')
          .insert({
            id: org.id,
            name: org.name,
            created_at: org.created_at
          });
        
        if (error) {
          console.log('  Error copying', org.name + ':', error.message);
        } else {
          console.log('  ✓ Added', org.name, 'to orgs table');
        }
      } else {
        console.log('  - Already exists:', org.name);
      }
    }
  }
  
  // Now add tom@chartingalpha.com to Org A
  const { data: users } = await supabase.auth.admin.listUsers();
  const tom = users?.users.find(u => u.email === 'tom@chartingalpha.com');
  
  if (tom && organizations && organizations.length > 0) {
    const orgA = organizations[0]; // First org (Org A)
    
    console.log('\nAdding tom@chartingalpha.com to', orgA.name + '...');
    
    // Check if already a member
    const { data: existing } = await supabase
      .from('org_members')
      .select('*')
      .eq('user_id', tom.id)
      .eq('org_id', orgA.id);
    
    if (!existing || existing.length === 0) {
      const { error } = await supabase
        .from('org_members')
        .insert({
          org_id: orgA.id,
          user_id: tom.id,
          role: 'admin'
        });
      
      if (error) {
        console.log('Error:', error.message);
      } else {
        console.log('✅ Successfully added tom@chartingalpha.com!');
      }
    } else {
      console.log('✓ Tom is already a member');
    }
  }
  
  console.log('\n✅ Done! Try accessing:');
  console.log('   http://localhost:3000/transactions/60f6871a-38a0-4d35-ab54-f71d892656ba');
}

syncOrgs().catch(console.error);