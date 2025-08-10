-- Core schema for multi-tenant compliance platform with RLS

-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Memberships table (users <-> organizations)
CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('broker_admin', 'agent', 'compliance')),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(org_id, user_id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text,
  status text DEFAULT 'draft',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Transaction files table
CREATE TABLE IF NOT EXISTS public.transaction_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  path text NOT NULL,
  kind text DEFAULT 'contract',
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Issues table
CREATE TABLE IF NOT EXISTS public.issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  rule_id text NOT NULL,
  severity text CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  cite text,
  message text NOT NULL,
  details_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Helper function to check organization membership
CREATE OR REPLACE FUNCTION public.is_org_member(target_org uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.memberships m 
    WHERE m.org_id = target_org 
    AND m.user_id = auth.uid()
  );
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_memberships_org_user ON public.memberships(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org_created ON public.transactions(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_files_tx ON public.transaction_files(tx_id);
CREATE INDEX IF NOT EXISTS idx_reports_tx ON public.reports(tx_id);
CREATE INDEX IF NOT EXISTS idx_issues_report ON public.issues(report_id);

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (public.is_org_member(id));

-- RLS Policies for memberships
CREATE POLICY "Users can view their own memberships"
  ON public.memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Broker admins can insert members"
  ON public.memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = memberships.org_id
      AND m.user_id = auth.uid()
      AND m.role = 'broker_admin'
    )
  );

-- RLS Policies for transactions
CREATE POLICY "Members can view org transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "Members can insert org transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "Members can update org transactions"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

-- RLS Policies for transaction_files
CREATE POLICY "Members can view org transaction files"
  ON public.transaction_files FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "Members can insert org transaction files"
  ON public.transaction_files FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "Members can update org transaction files"
  ON public.transaction_files FOR UPDATE
  TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

-- RLS Policies for reports
CREATE POLICY "Members can view org reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "Members can insert org reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "Members can update org reports"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

-- RLS Policies for issues
-- Issues don't have org_id directly, so we need to join through reports
CREATE POLICY "Members can view issues for their org reports"
  ON public.issues FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = issues.report_id
      AND public.is_org_member(r.org_id)
    )
  );

CREATE POLICY "Members can insert issues for their org reports"
  ON public.issues FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = issues.report_id
      AND public.is_org_member(r.org_id)
    )
  );

CREATE POLICY "Members can update issues for their org reports"
  ON public.issues FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = issues.report_id
      AND public.is_org_member(r.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = issues.report_id
      AND public.is_org_member(r.org_id)
    )
  );