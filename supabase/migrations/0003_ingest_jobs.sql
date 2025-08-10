-- Lightweight job queue for file ingestion pipeline

-- Create ingest_jobs table
CREATE TABLE IF NOT EXISTS public.ingest_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tx_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.transaction_files(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('queued', 'processing', 'done', 'error')),
  error text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ingest_jobs_org_tx ON public.ingest_jobs(org_id, tx_id);
CREATE INDEX IF NOT EXISTS idx_ingest_jobs_status_updated ON public.ingest_jobs(status, updated_at DESC);

-- Enable Row Level Security
ALTER TABLE public.ingest_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ingest_jobs
CREATE POLICY "Members can view org ingest jobs"
  ON public.ingest_jobs FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "Members can insert org ingest jobs"
  ON public.ingest_jobs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "Members can update org ingest jobs"
  ON public.ingest_jobs FOR UPDATE
  TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row update
CREATE TRIGGER update_ingest_jobs_updated_at
  BEFORE UPDATE ON public.ingest_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();