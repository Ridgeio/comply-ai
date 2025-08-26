-- Fix RLS infinite recursion issues
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/zygaagumqbloombllcdk/sql/new

-- First, check what policies exist on org_members
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'org_members';

-- Drop the problematic recursive policy on org_members
DROP POLICY IF EXISTS "Users can view members of their orgs" ON org_members;

-- Create a simpler non-recursive policy for org_members
-- Users can only see their own membership records
DROP POLICY IF EXISTS "Users can view their own memberships only" ON org_members;
CREATE POLICY "Users can view their own memberships only" 
  ON org_members 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Fix transaction policies to avoid recursion
DROP POLICY IF EXISTS "Users can view their org transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions in their orgs" ON transactions;

-- Recreate transaction policies without recursion
CREATE POLICY "Users can view their org transactions" 
  ON transactions 
  FOR SELECT 
  USING (
    org_id IN (
      SELECT org_id 
      FROM org_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transactions in their orgs" 
  ON transactions 
  FOR INSERT 
  WITH CHECK (
    org_id IN (
      SELECT org_id 
      FROM org_members 
      WHERE user_id = auth.uid()
    )
  );

-- Check the policies after fix
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('org_members', 'transactions')
ORDER BY tablename, policyname;