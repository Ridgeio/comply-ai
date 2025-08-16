-- Initial database schema for Comply AI

-- Organizations
CREATE TABLE IF NOT EXISTS orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization members
CREATE TABLE IF NOT EXISTS org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction files
CREATE TABLE IF NOT EXISTS transaction_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  path TEXT NOT NULL UNIQUE,
  kind TEXT DEFAULT 'contract' CHECK (kind IN ('contract', 'addendum', 'disclosure', 'other')),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingest jobs for processing files
CREATE TABLE IF NOT EXISTS ingest_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  tx_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  file_id UUID REFERENCES transaction_files(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'error')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  tx_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  file_id UUID REFERENCES transaction_files(id) ON DELETE CASCADE,
  issues JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_transaction_files_tx_id ON transaction_files(tx_id);
CREATE INDEX IF NOT EXISTS idx_ingest_jobs_file_id ON ingest_jobs(file_id);
CREATE INDEX IF NOT EXISTS idx_reports_tx_id ON reports(tx_id);

-- Enable Row Level Security
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingest_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Orgs: Users can view orgs they're members of
CREATE POLICY "Users can view their orgs" ON orgs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = orgs.id
      AND org_members.user_id = auth.uid()
    )
  );

-- Org members: Users can view members of their orgs
CREATE POLICY "Users can view members of their orgs" ON org_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM org_members AS om
      WHERE om.org_id = org_members.org_id
      AND om.user_id = auth.uid()
    )
  );

-- Transactions: Users can view transactions in their orgs
CREATE POLICY "Users can view their org transactions" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = transactions.org_id
      AND org_members.user_id = auth.uid()
    )
  );

-- Transactions: Users can create transactions in their orgs
CREATE POLICY "Users can create transactions in their orgs" ON transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = transactions.org_id
      AND org_members.user_id = auth.uid()
    )
  );

-- Transaction files: Users can view files in their org's transactions
CREATE POLICY "Users can view their org transaction files" ON transaction_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = transaction_files.org_id
      AND org_members.user_id = auth.uid()
    )
  );

-- Transaction files: Users can upload files to their org's transactions
CREATE POLICY "Users can upload files to their org transactions" ON transaction_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = transaction_files.org_id
      AND org_members.user_id = auth.uid()
    )
  );

-- Ingest jobs: Users can view jobs for their org's files
CREATE POLICY "Users can view their org ingest jobs" ON ingest_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = ingest_jobs.org_id
      AND org_members.user_id = auth.uid()
    )
  );

-- Ingest jobs: Users can create jobs for their org's files
CREATE POLICY "Users can create ingest jobs for their org" ON ingest_jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = ingest_jobs.org_id
      AND org_members.user_id = auth.uid()
    )
  );

-- Reports: Users can view reports for their org's transactions
CREATE POLICY "Users can view their org reports" ON reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = reports.org_id
      AND org_members.user_id = auth.uid()
    )
  );

-- Reports: Users can create reports for their org's transactions
CREATE POLICY "Users can create reports for their org" ON reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = reports.org_id
      AND org_members.user_id = auth.uid()
    )
  );