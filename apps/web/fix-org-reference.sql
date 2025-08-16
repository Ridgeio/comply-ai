-- Temporary fix: Copy orgs data to organizations table
-- This is needed because transactions table references organizations, not orgs

-- First, insert any missing organizations from orgs table
INSERT INTO public.organizations (id, name, created_by, created_at)
SELECT 
  o.id, 
  o.name,
  COALESCE(om.user_id, o.id) as created_by, -- Use first member as created_by
  o.created_at
FROM public.orgs o
LEFT JOIN public.org_members om ON o.id = om.org_id AND om.role = 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizations org WHERE org.id = o.id
)
ON CONFLICT (id) DO NOTHING;

-- Verify the fix
SELECT 'orgs table:' as source, count(*) as count FROM public.orgs
UNION ALL
SELECT 'organizations table:' as source, count(*) as count FROM public.organizations;