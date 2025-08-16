-- Simple seed data - run this after you have a user
-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users table

-- You can find your user ID by running:
-- SELECT id, email FROM auth.users;

-- Then run this with your user ID:
DO $$
DECLARE
  test_user_id UUID := 'YOUR_USER_ID'::UUID; -- REPLACE THIS!
  test_org_id UUID;
BEGIN
  -- Create a test organization
  INSERT INTO orgs (name) 
  VALUES ('Acme Real Estate')
  RETURNING id INTO test_org_id;

  -- Add the user as an admin
  INSERT INTO org_members (org_id, user_id, role)
  VALUES (test_org_id, test_user_id, 'admin');
  
  -- Create sample transactions
  INSERT INTO transactions (org_id, title, status)
  VALUES 
    (test_org_id, '123 Main Street - Purchase Agreement', 'active'),
    (test_org_id, '456 Oak Avenue - Lease Agreement', 'draft'),
    (test_org_id, '789 Pine Road - Sales Contract', 'completed');
  
  RAISE NOTICE 'Setup complete! Created org % with sample transactions', test_org_id;
END $$;