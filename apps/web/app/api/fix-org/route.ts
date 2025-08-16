import { NextResponse } from 'next/server'
import { createAdminClient } from '@/src/lib/supabaseAdmin'

export async function GET() {
  const adminClient = createAdminClient()
  
  try {
    // Get the org from orgs table
    const { data: orgs, error: orgsError } = await adminClient
      .from('orgs')
      .select('*')
      .eq('id', '0ba29203-4cef-4cfe-99b2-a180d5832a81')
      .single()
    
    if (orgsError) {
      return NextResponse.json({ error: 'Org not found in orgs table', details: orgsError }, { status: 404 })
    }
    
    // Check if it exists in organizations table
    const { data: existing } = await adminClient
      .from('organizations')
      .select('id')
      .eq('id', orgs.id)
      .single()
    
    if (existing) {
      return NextResponse.json({ message: 'Organization already exists in organizations table' })
    }
    
    // Get the user who created it (first admin member)
    const { data: member } = await adminClient
      .from('org_members')
      .select('user_id')
      .eq('org_id', orgs.id)
      .eq('role', 'admin')
      .limit(1)
      .single()
    
    // Insert into organizations table
    const { data: newOrg, error: insertError } = await adminClient
      .from('organizations')
      .insert({
        id: orgs.id,
        name: orgs.name,
        created_by: member?.user_id || '09f3b43f-7316-4d36-ba93-ee89fb9cb690', // fallback to your user ID
        created_at: orgs.created_at
      })
      .select()
      .single()
    
    if (insertError) {
      return NextResponse.json({ error: 'Failed to insert into organizations table', details: insertError }, { status: 500 })
    }
    
    return NextResponse.json({ 
      message: 'Successfully synced organization',
      organization: newOrg 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Unexpected error', details: error }, { status: 500 })
  }
}