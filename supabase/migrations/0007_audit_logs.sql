-- Create audit logs table for tracking all actions
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  action text not null,                    -- e.g., 'report.generate', 'upload.file', 'rule.fire'
  target_type text not null,               -- 'transaction' | 'file' | 'report' | 'issue'
  target_id uuid not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.audit_logs enable row level security;

-- Create indexes for performance
create index idx_audit_logs_org_created on public.audit_logs(org_id, created_at desc);
create index idx_audit_logs_action on public.audit_logs(action, created_at desc);
create index idx_audit_logs_target on public.audit_logs(target_type, target_id);

-- RLS policies
create policy "Members can read their org audit logs" 
  on public.audit_logs 
  for select 
  using (public.is_org_member(org_id));

create policy "Members can insert audit logs for their org" 
  on public.audit_logs 
  for insert 
  with check (public.is_org_member(org_id));

-- No update or delete allowed on audit logs (immutable)