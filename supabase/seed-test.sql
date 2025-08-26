-- Test seed data for RLS tests
-- This creates the specific data expected by the RLS test suite

-- First, ensure we have the test users in auth.users
-- Note: In a real test environment, these would be created via Supabase Auth API
-- For local testing, we create them directly

DO $$
DECLARE
  agent1_id UUID;
  agent2_id UUID;
  org_a_id UUID;
  org_b_id UUID;
BEGIN
  -- Create test users if they don't exist
  -- Note: In production Supabase, you'd use the Auth Admin API
  -- For local testing, we insert directly into auth.users
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), 'agent1@example.com', crypt('testpass123', gen_salt('bf')), now(), now(), now()),
    (gen_random_uuid(), 'agent2@example.com', crypt('testpass123', gen_salt('bf')), now(), now(), now())
  ON CONFLICT (email) DO NOTHING;

  -- Get the user IDs
  SELECT id INTO agent1_id FROM auth.users WHERE email = 'agent1@example.com';
  SELECT id INTO agent2_id FROM auth.users WHERE email = 'agent2@example.com';

  -- Create organizations
  INSERT INTO public.organizations (name, created_by, created_at)
  VALUES 
    ('Org A', agent1_id, now()),
    ('Org B', agent2_id, now())
  RETURNING id INTO org_b_id;
  
  -- Get Org A ID (the first insert)
  SELECT id INTO org_a_id FROM public.organizations WHERE name = 'Org A';

  -- Create memberships
  INSERT INTO public.memberships (org_id, user_id, role, created_at)
  VALUES 
    (org_a_id, agent1_id, 'agent', now()),
    (org_b_id, agent2_id, 'agent', now());

  -- Create test transactions
  INSERT INTO public.transactions (org_id, title, status, created_by, created_at)
  VALUES 
    (org_a_id, 'Transaction A1', 'draft', agent1_id, now()),
    (org_b_id, 'Transaction B1', 'draft', agent2_id, now());

  RAISE NOTICE 'Test data created successfully';
  RAISE NOTICE 'Agent1 (%) is member of Org A (%)', agent1_id, org_a_id;
  RAISE NOTICE 'Agent2 (%) is member of Org B (%)', agent2_id, org_b_id;
END $$;