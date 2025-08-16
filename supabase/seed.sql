-- Seed data for development
-- Run this after creating a user through Supabase Auth

-- Get the first authenticated user (for development)
-- You'll need to replace this with your actual user ID after signing up
DO $$
DECLARE
  test_user_id UUID;
  test_org_id UUID;
  test_tx_id UUID;
BEGIN
  -- Try to get the first user from auth.users
  -- Note: You may need to manually set this to your user ID
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'No users found. Please sign up first through the app.';
    RETURN;
  END IF;

  -- Create a test organization
  INSERT INTO orgs (name) 
  VALUES ('Acme Real Estate')
  RETURNING id INTO test_org_id;
  
  RAISE NOTICE 'Created org with ID: %', test_org_id;

  -- Add the user as an admin of the organization
  INSERT INTO org_members (org_id, user_id, role)
  VALUES (test_org_id, test_user_id, 'admin');
  
  -- Create some sample transactions
  INSERT INTO transactions (org_id, title, status)
  VALUES 
    (test_org_id, '123 Main Street - Purchase Agreement', 'active'),
    (test_org_id, '456 Oak Avenue - Lease Agreement', 'draft'),
    (test_org_id, '789 Pine Road - Sales Contract', 'completed')
  RETURNING id INTO test_tx_id;
  
  RAISE NOTICE 'Created sample transactions';
  RAISE NOTICE 'Setup complete! User % is now an admin of org %', test_user_id, test_org_id;
END $$;