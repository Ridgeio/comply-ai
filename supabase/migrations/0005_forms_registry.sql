-- Create forms registry table for managing expected form versions
create table if not exists public.forms_registry (
  id uuid primary key default gen_random_uuid(),
  form_code text not null,           -- e.g., 'TREC-20'
  expected_version text not null,    -- e.g., '20-18'
  effective_date date,
  updated_at timestamptz default now(),
  unique(form_code)
);

-- Enable RLS
alter table public.forms_registry enable row level security;

-- Readable by all members of any org (public reference table)
create policy "read forms registry" on public.forms_registry 
  for select using (true);

-- Add comment for documentation
comment on table public.forms_registry is 'Registry of expected form versions for compliance checking';
comment on column public.forms_registry.form_code is 'Unique identifier for the form (e.g., TREC-20)';
comment on column public.forms_registry.expected_version is 'Current expected version of the form';
comment on column public.forms_registry.effective_date is 'Date when this version became effective';