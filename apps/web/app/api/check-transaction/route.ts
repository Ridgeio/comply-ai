import { NextResponse } from 'next/server'
import { createAdminClient } from '@/src/lib/supabaseAdmin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const txId = searchParams.get('id') || 'd563a0cb-3367-4310-af0d-6f1109432df2'
  
  const adminClient = createAdminClient()
  
  try {
    // Check if transaction exists
    const { data: tx, error: txError } = await adminClient
      .from('transactions')
      .select('*')
      .eq('id', txId)
      .single()
    
    // Try to get org from orgs table
    let orgFromOrgs = null
    if (tx) {
      const { data } = await adminClient
        .from('orgs')
        .select('*')
        .eq('id', tx.org_id)
        .single()
      orgFromOrgs = data
    }
    
    // Try to get org from organizations table
    let orgFromOrganizations = null
    if (tx) {
      const { data } = await adminClient
        .from('organizations')
        .select('*')
        .eq('id', tx.org_id)
        .single()
      orgFromOrganizations = data
    }
    
    return NextResponse.json({
      transaction: tx || null,
      transactionError: txError?.message || null,
      orgFromOrgs,
      orgFromOrganizations,
      analysis: {
        transactionExists: !!tx,
        orgExistsInOrgs: !!orgFromOrgs,
        orgExistsInOrganizations: !!orgFromOrganizations
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Unexpected error', details: error }, { status: 500 })
  }
}