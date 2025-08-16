'use server'

import { createAdminClient } from '@/src/lib/supabaseAdmin'
import { requireCurrentOrg } from '@/src/lib/org'
import { revalidatePath } from 'next/cache'

export interface Transaction {
  id: string
  org_id: string
  title: string
  status: 'draft' | 'active' | 'completed' | 'archived'
  created_at: string
  updated_at: string
}

/**
 * List all transactions for an organization
 */
export async function listTransactionsForOrg(orgId: string): Promise<Transaction[]> {
  const supabase = createAdminClient()
  
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching transactions:', error)
    throw new Error('Failed to fetch transactions')
  }
  
  return transactions || []
}

/**
 * Create a new transaction
 */
export async function createTransaction({ 
  title 
}: { 
  title: string 
}): Promise<{ id: string }> {
  // Get authenticated user
  const { supabaseServer } = await import('@/src/lib/supabaseServer')
  const serverSupabase = supabaseServer()
  const { data: { user }, error: authError } = await serverSupabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('Authentication required')
  }
  
  // Get current org - will redirect to onboarding if none
  const orgId = await requireCurrentOrg()
  
  // Use admin client for database operations
  const supabase = createAdminClient()
  
  // Create the transaction
  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert({
      org_id: orgId,
      title,
      status: 'draft',
      created_by: user.id
    })
    .select()
    .single()
  
  if (error || !transaction) {
    console.error('Error creating transaction:', error)
    throw new Error('Failed to create transaction')
  }
  
  // Revalidate the transactions list
  revalidatePath('/transactions')
  
  return { id: transaction.id }
}

/**
 * Get a single transaction by ID
 */
export async function getTransaction(txId: string): Promise<Transaction & { org_name: string }> {
  // Import server client at runtime to avoid issues
  const { supabaseServer } = await import('@/src/lib/supabaseServer')
  const serverSupabase = supabaseServer()
  
  // Get current user from session
  const { data: { user }, error: authError } = await serverSupabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Authentication required')
  }
  
  // Now use admin client for database operations
  const supabase = createAdminClient()
  
  // Get transaction first
  const { data: transaction, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', txId)
    .single()
  
  if (error || !transaction) {
    console.error('Error fetching transaction:', error)
    throw new Error('Transaction not found')
  }
  
  // Get org details separately (works with either orgs or organizations table)
  const { data: org } = await supabase
    .from('orgs')
    .select('name')
    .eq('id', transaction.org_id)
    .single()
  
  // Check user has access to this org
  const { data: membership } = await supabase
    .from('org_members')
    .select('id')
    .eq('org_id', transaction.org_id)
    .eq('user_id', user.id)
    .single()
  
  if (!membership) {
    throw new Error('You do not have access to this transaction')
  }
  
  return {
    ...transaction,
    org_name: org?.name || 'Unknown Organization'
  }
}