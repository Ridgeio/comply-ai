Nice—time to land the “last mile” features. Here are the next three copy-pasteable prompts (16–18) to finish observability, sharing/redaction, and persona workflows. All are TDD-first and match your stack.

---

# Prompt 16 — Audit trail + “Explain” for every issue (tests first)

**Paste to Claude Code (Cursor):**

You are my senior engineer. Add a full **audit trail** and an **Explain** panel so compliance can see exactly why a rule fired. Follow **TDD**.

## 1) Migration (audit logs)

Create `supabase/migrations/0006_audit_logs.sql`:

```sql
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  actor_id uuid not null,
  action text not null,                    -- e.g., 'report.generate', 'upload.file', 'rule.fire'
  target_type text not null,               -- 'transaction' | 'file' | 'report' | 'issue'
  target_id uuid not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
create index on public.audit_logs(org_id, created_at desc);
create policy "members read audit" on public.audit_logs for select using (is_org_member(org_id));
create policy "members insert audit" on public.audit_logs for insert with check (is_org_member(org_id));
```

## 2) Rule engine: add debug snapshots (pure, optional)

* File: `packages/shared/src/rules/types.ts` — extend `Rule<T>`:

```ts
export type Rule<T> = {
  id: string;
  description: string;
  severity: Severity;
  cite?: string;
  predicate: (input: T) => boolean;         // problem? true/false
  build?: (input: T) => Partial<Issue>;     // customize message/data
  debug?: (input: T) => Record<string, unknown>; // returns minimal inputs used
};
```

* File: `packages/shared/src/rules/engine.ts` — when a rule fires, if `debug` exists, merge into `issue.data.debug`.

## 3) Generate Report: persist audit + debug

* In `apps/web/src/app/transactions/[txId]/actions/generateReport.ts`:

  * After computing `issues`, **insert** `audit_logs` row:

    * `action: 'report.generate'`, `target_type: 'report'`, `target_id: <new report id>`, `payload_json: { countsBySeverity, fileId, mode, formVersion }`.
  * For each **issue**, add `audit_logs` row with:

    * `action: 'rule.fire'`, `target_type: 'issue'`, `target_id: <issue id>`, `payload_json: issue.data` (includes `debug` if present).

## 4) Explain UI

* Add `apps/web/app/transactions/[txId]/report/ExplainDrawer.tsx` (client)

  * Props: `{ issueId: string, data: any }`
  * Renders a drawer with:

    * “Why this fired” (issue.message)
    * “Inputs used” — pretty JSON of `data.debug` (if any) with copy button
    * “Citation” (issue.cite if present)

* In `IssuesTable.tsx`, add an **Explain** button per row that opens the drawer with that issue’s `details_json` / `data`.

## 5) Tests FIRST (RED)

* `packages/shared/src/rules/__tests__/engine-debug.spec.ts`

  * Define a rule with `predicate` true and `debug` returning `{ a: 1 }`.
  * Expect `runRules` to include `data.debug.a === 1`.

* `apps/web/tests/audit-logging.spec.ts`

  * Mock DB and `generateReport` action; expect an `audit_logs` insert for `report.generate` and one `rule.fire` per issue.

* `apps/web/app/transactions/[txId]/report/__tests__/explain-ui.spec.tsx`

  * Render a row with `details_json.debug` data; clicking **Explain** shows the drawer and the debug key/value.

## 6) Commands

1. Create files/tests; show diffs.
2. Run:

   ```
   pnpm test --filter @repo/shared
   pnpm test --filter @app/web
   ```

   Make red → implement → green.

## Acceptance

* Every generated report writes a `report.generate` audit entry.
* Every issue writes a `rule.fire` audit entry with the rule’s debug inputs.
* Explain drawer shows the exact inputs behind a fired rule, with copy-to-clipboard.
* Tests pass.

---

# Prompt 17 — Shareable read-only reports + redaction (tests first)

**Paste to Claude Code:**

Add secure **share links** for read-only report viewing and a configurable **redaction** step (names, emails, addresses). Follow **TDD**.

## 1) Migration (share links)

Create `supabase/migrations/0007_share_links.sql`:

```sql
create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  report_id uuid not null references public.reports(id) on delete cascade,
  token text not null unique,              -- random 32+ chars
  expires_at timestamptz not null,
  redact boolean not null default true,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
alter table public.share_links enable row level security;
create index on public.share_links(org_id, report_id);
-- Members can manage links; public access is handled by Next.js token route
create policy "members read share_links" on public.share_links for select using (is_org_member(org_id));
create policy "members insert share_links" on public.share_links for insert with check (is_org_member(org_id));
create policy "members delete share_links" on public.share_links for delete using (is_org_member(org_id));
```

## 2) Redaction utility (pure)

* `packages/shared/src/redaction.ts`

```ts
export type RedactionOptions = { names?: boolean; emails?: boolean; addresses?: boolean };
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const ADDRESS = /\b\d{1,6}\s+[A-Za-z0-9 .'-]+,\s*[A-Za-z .'-]+,\s*[A-Z]{2}\s*\d{5}(-\d{4})?\b/g;

export function redactText(text: string, opts: RedactionOptions = { names:true, emails:true, addresses:true }) {
  let out = text ?? '';
  if (opts.emails) out = out.replace(EMAIL, '[REDACTED-EMAIL]');
  if (opts.addresses) out = out.replace(ADDRESS, '[REDACTED-ADDRESS]');
  // names are tricky; leave as TODO rule-based if needed; for now, no-op or accept a list to mask.
  return out;
}

export function redactIssueDetails(details: any, opts?: RedactionOptions) {
  const clone = JSON.parse(JSON.stringify(details ?? {}));
  const walk = (v: any): any => {
    if (typeof v === 'string') return redactText(v, opts);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') { for (const k of Object.keys(v)) v[k] = walk(v[k]); }
    return v;
  };
  return walk(clone);
}
```

## 3) Server actions (create/revoke link)

* `apps/web/src/app/transactions/[txId]/actions/share.ts`

```ts
'use server';
import crypto from 'node:crypto';
import { supabaseServer } from '@/src/lib/supabaseServer';
import { requireCurrentOrg } from '@/src/lib/org';

export async function createShareLink(reportId: string, { expiresInDays = 7, redact = true } = {}) {
  const orgId = await requireCurrentOrg();
  const sb = supabaseServer();
  const token = crypto.randomBytes(24).toString('hex');
  const expires_at = new Date(Date.now() + expiresInDays*864e5).toISOString();
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from('share_links').insert({ org_id: orgId, report_id: reportId, token, expires_at, redact, created_by: user!.id });
  if (error) throw error;
  return { token, expires_at };
}

export async function revokeShareLink(token: string) {
  const orgId = await requireCurrentOrg();
  const sb = supabaseServer();
  await sb.from('share_links').delete().eq('org_id', orgId).eq('token', token);
}
```

## 4) Public read-only route

* `apps/web/app/(public)/share/[token]/page.tsx` (server)

  * Load `share_links` by `token`; if missing or expired → 404.
  * Load `report` + `issues` by `report_id`; **do not** require auth.
  * If `redact`, transform `issues.details_json` via `redactIssueDetails`.
  * Render a minimal read-only view (no nav, no actions). Include “Data provided for informational purposes only” disclaimer.

## 5) Report UI: Share controls

* In the Report tab header:

  * Button “Create Share Link” → calls `createShareLink(reportId)` and shows the URL `/share/${token}` with copy button.
  * List existing links with expiry + revoke button.

## 6) Tests FIRST (RED)

* `packages/shared/src/__tests__/redaction.spec.ts`

  * Assert `redactText` masks emails and addresses; `redactIssueDetails` walks nested objects/arrays.

* `apps/web/app/(public)/share/__tests__/share-public.spec.tsx`

  * Mock DB:

    * When token valid and not expired, page renders issues (with redacted email/address strings).
    * When expired, returns 404 (or a “Link expired” page).

* `apps/web/tests/share-ui.spec.tsx`

  * From Report tab, clicking **Create Share Link** shows copied URL; **Revoke** removes it from list.

## 7) Commands

1. Create files/tests; show diffs.
2. Run:

   ```
   pnpm test --filter @repo/shared
   pnpm test --filter @app/web
   ```

   Red → implement → green.

## Acceptance

* You can generate a share URL, open it logged out, and view a read-only, redacted report.
* Redaction masks emails/addresses in summaries/details.
* Links can be revoked; expired tokens don’t work.
* Tests pass.

---

# Prompt 18 — Persona dashboards + feedback loop + retention policy (tests first)

**Paste to Claude Code:**

Build role-specific dashboards, add a **false-positive/false-negative** feedback loop for issues, and implement a basic **retention policy** job. Follow **TDD**.

## 1) Migrations

Create `supabase/migrations/0008_issue_feedback_and_retention.sql`:

```sql
create table if not exists public.issue_feedback (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  issue_id uuid not null references public.issues(id) on delete cascade,
  user_id uuid not null,
  label text not null check (label in ('false_positive','false_negative','resolved')),
  note text,
  created_at timestamptz not null default now()
);
alter table public.issue_feedback enable row level security;
create index on public.issue_feedback(org_id, issue_id);
create policy "members read feedback" on public.issue_feedback for select using (is_org_member(org_id));
create policy "members insert feedback" on public.issue_feedback for insert with check (is_org_member(org_id));

-- Retention policy config per org
create table if not exists public.org_settings (
  org_id uuid primary key,
  retention_days int not null default 60,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.org_settings enable row level security;
create policy "members read org_settings" on public.org_settings for select using (is_org_member(org_id));
create policy "admins write org_settings" on public.org_settings for update using (
  exists(select 1 from memberships m where m.org_id=org_id and m.user_id=auth.uid() and m.role='broker_admin')
) with check (
  exists(select 1 from memberships m where m.org_id=org_id and m.user_id=auth.uid() and m.role='broker_admin')
);
```

## 2) Dashboards (protected)

* Routes:

  * `apps/web/app/(protected)/dashboard/page.tsx` (role-aware tiles)
  * `apps/web/app/(protected)/dashboard/compliance/page.tsx` — **Compliance Queue**

    * Table of latest **issues** across org, filters (severity/date/rule), quick links to open report row anchored.
  * `apps/web/app/(protected)/dashboard/agent/page.tsx` — **My Transactions**

    * Cards of your transactions, “Upload” and “Generate Report” quick actions.
  * `apps/web/app/(protected)/dashboard/admin/page.tsx` — **Broker Admin**

    * KPIs (reports last 7/30 days), noisy rules, retention setting edit.

* Navigation: add a select/chips to toggle personas (show only the ones the signed-in user has via `memberships.role`).

## 3) Feedback capture

* In `IssuesTable` row, add a **Feedback** dropdown: “Mark as False Positive / False Negative / Resolved” (optional note modal).

* Server action: `apps/web/src/app/transactions/[txId]/report/actions/feedback.ts`

  ```ts
  'use server';
  import { requireCurrentOrg } from '@/src/lib/org';
  import { supabaseServer } from '@/src/lib/supabaseServer';

  export async function submitIssueFeedback(issueId: string, label: 'false_positive'|'false_negative'|'resolved', note?: string) {
    const orgId = await requireCurrentOrg();
    const sb = supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from('issue_feedback').insert({ org_id: orgId, issue_id: issueId, user_id: user!.id, label, note });
    if (error) throw error;
  }
  ```

* Weekly **noise report** (server action + cron later):

  * Utility that aggregates `issue_feedback` counts by `rule_id` in last 7/30 days.

## 4) Retention job

* Add server route: `apps/web/app/api/maintenance/retention/route.ts` (server)

  * For each org with `org_settings.retention_days = N`, delete from:

    * `transaction_files` older than N days (and delete Storage blobs),
    * `reports` older than N days,
    * corresponding `audit_logs`.
  * Protect with a secret bearer token `RETENTION_SECRET`.
* Configure **Vercel Cron** (document only; no code here) to hit this endpoint daily.

## 5) Tests FIRST (RED)

* `apps/web/app/(protected)/dashboard/__tests__/compliance-queue.spec.tsx`

  * Renders list of issues with filters; selecting severity narrows results; clicking an item navigates to report anchor.

* `apps/web/app/transactions/[txId]/report/__tests__/feedback.spec.tsx`

  * Clicking “False Positive” calls `submitIssueFeedback` and shows confirmation.

* `apps/web/tests/retention.spec.ts`

  * Unit test the retention logic function (extract into pure helper in `apps/web/src/lib/retention.ts`):

    * Given a list of file/report timestamps and N=30, returns the IDs to purge.

## 6) Commands

1. Create migrations, pages, actions, tests; show diffs.
2. Run:

   ```
   pnpm test --filter @app/web
   ```

   Red → implement → green.

## Acceptance

* Role-aware dashboards exist:

  * **Agent**: quick access to my transactions.
  * **Compliance**: org-wide issues queue with filters.
  * **Broker Admin**: KPIs and retention setting editor.
* Feedback can be recorded per issue; noise report utility exists.
* Retention job deletes old artifacts when invoked with secret.
* Tests pass.

---

If you want to keep going after these, next up would be **billing & entitlements** (per-file credits + seats), **multi-form upload UX** (auto-detect and link addenda to the base contract), and a lightweight **broker import** (CSV of agents to auto-invite).
