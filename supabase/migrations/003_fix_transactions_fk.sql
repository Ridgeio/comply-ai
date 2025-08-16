-- Fix the foreign key constraint on transactions table
-- The transactions table was created referencing 'organizations' but we're using 'orgs'

-- Drop the existing foreign key constraint
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_org_id_fkey;

-- Add the correct foreign key constraint to reference orgs table
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_org_id_fkey 
FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;

-- Also ensure the transaction_files table references the correct table
ALTER TABLE public.transaction_files 
DROP CONSTRAINT IF EXISTS transaction_files_org_id_fkey;

ALTER TABLE public.transaction_files 
ADD CONSTRAINT transaction_files_org_id_fkey 
FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;