import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServiceClient, signInAsUser } from './supabaseTest'

describe('Row Level Security (RLS)', () => {
  const serviceClient = createServiceClient()
  
  let agent1UserId: string
  let agent2UserId: string
  let orgAId: string
  let orgBId: string
  let orgATransactionId: string
  let orgBTransactionId: string

  beforeAll(async () => {
    // Get the user IDs from the seeded data
    const { data: users } = await serviceClient.auth.admin.listUsers()
    const agent1 = users.users.find(u => u.email === 'agent1@example.com')
    const agent2 = users.users.find(u => u.email === 'agent2@example.com')
    
    if (!agent1 || !agent2) {
      throw new Error('Test users not found. Run seed script first.')
    }
    
    agent1UserId = agent1.id
    agent2UserId = agent2.id
    
    // Get the org IDs
    const { data: orgs } = await serviceClient
      .from('organizations')
      .select('id, name')
      .order('created_at')
    
    const orgA = orgs?.find(o => o.name === 'Org A')
    const orgB = orgs?.find(o => o.name === 'Org B')
    
    if (!orgA || !orgB) {
      throw new Error('Test organizations not found. Run seed script first.')
    }
    
    orgAId = orgA.id
    orgBId = orgB.id
    
    // Get transaction IDs
    const { data: transactions } = await serviceClient
      .from('transactions')
      .select('id, org_id, title')
      .order('created_at')
    
    const txA = transactions?.find(t => t.org_id === orgAId)
    const txB = transactions?.find(t => t.org_id === orgBId)
    
    if (!txA || !txB) {
      throw new Error('Test transactions not found. Run seed script first.')
    }
    
    orgATransactionId = txA.id
    orgBTransactionId = txB.id
  })

  describe('Organization isolation', () => {
    it('agent1 can only see Org A transactions', async () => {
      const { client } = await signInAsUser('agent1@example.com', 'testpass123')
      
      const { data: transactions, error } = await client
        .from('transactions')
        .select('id, org_id, title')
      
      expect(error).toBeNull()
      expect(transactions).toHaveLength(1)
      expect(transactions?.[0].org_id).toBe(orgAId)
      expect(transactions?.[0].title).toBe('Transaction A1')
    })

    it('agent2 can only see Org B transactions', async () => {
      const { client } = await signInAsUser('agent2@example.com', 'testpass123')
      
      const { data: transactions, error } = await client
        .from('transactions')
        .select('id, org_id, title')
      
      expect(error).toBeNull()
      expect(transactions).toHaveLength(1)
      expect(transactions?.[0].org_id).toBe(orgBId)
      expect(transactions?.[0].title).toBe('Transaction B1')
    })

    it('agent1 cannot insert transactions into Org B', async () => {
      const { client } = await signInAsUser('agent1@example.com', 'testpass123')
      
      const { data, error } = await client
        .from('transactions')
        .insert({
          org_id: orgBId, // Try to insert into Org B
          title: 'Unauthorized Transaction',
          status: 'draft',
          created_by: agent1UserId
        })
        .select()
      
      // Should fail with RLS violation
      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501') // PostgreSQL insufficient_privilege error
      expect(data).toBeNull()
    })

    it('agent2 cannot insert transactions into Org A', async () => {
      const { client } = await signInAsUser('agent2@example.com', 'testpass123')
      
      const { data, error } = await client
        .from('transactions')
        .insert({
          org_id: orgAId, // Try to insert into Org A
          title: 'Unauthorized Transaction',
          status: 'draft',
          created_by: agent2UserId
        })
        .select()
      
      // Should fail with RLS violation
      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501') // PostgreSQL insufficient_privilege error
      expect(data).toBeNull()
    })
  })

  describe('Organization membership', () => {
    it('agent1 can see their membership in Org A', async () => {
      const { client } = await signInAsUser('agent1@example.com', 'testpass123')
      
      const { data: memberships, error } = await client
        .from('memberships')
        .select('org_id, role')
      
      expect(error).toBeNull()
      expect(memberships).toHaveLength(1)
      expect(memberships?.[0].org_id).toBe(orgAId)
      expect(memberships?.[0].role).toBe('agent')
    })

    it('agent2 can see their membership in Org B', async () => {
      const { client } = await signInAsUser('agent2@example.com', 'testpass123')
      
      const { data: memberships, error } = await client
        .from('memberships')
        .select('org_id, role')
      
      expect(error).toBeNull()
      expect(memberships).toHaveLength(1)
      expect(memberships?.[0].org_id).toBe(orgBId)
      expect(memberships?.[0].role).toBe('agent')
    })

    it('users cannot see memberships from other organizations', async () => {
      const { client } = await signInAsUser('agent1@example.com', 'testpass123')
      
      // Try to query all memberships (should only see their own)
      const { data: memberships } = await client
        .from('memberships')
        .select('*')
      
      expect(memberships).toHaveLength(1)
      expect(memberships?.[0].user_id).toBe(agent1UserId)
    })
  })

  describe('Reports and Issues isolation', () => {
    it('agent1 can only access reports from Org A', async () => {
      const { client } = await signInAsUser('agent1@example.com', 'testpass123')
      
      // Create a report for Org A transaction
      const { data: report, error: reportError } = await client
        .from('reports')
        .insert({
          tx_id: orgATransactionId,
          org_id: orgAId,
          summary_json: { test: 'report A' }
        })
        .select()
        .single()
      
      expect(reportError).toBeNull()
      expect(report).not.toBeNull()
      
      // Try to create a report for Org B transaction (should fail)
      const { error: crossOrgError } = await client
        .from('reports')
        .insert({
          tx_id: orgBTransactionId,
          org_id: orgBId,
          summary_json: { test: 'unauthorized' }
        })
      
      expect(crossOrgError).not.toBeNull()
      expect(crossOrgError?.code).toBe('42501')
    })
  })
})