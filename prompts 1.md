Perfect. Here are the first 3, copy-pasteable, Claude/Cursor-friendly prompts. They’re written so you can paste, run, and iterate in TDD style.

---

# Prompt 1 — Monorepo + Next.js app scaffold (tests first)

**Paste to Claude Code:**

You are my senior full-stack engineer. Create a production-ready monorepo scaffold using **pnpm + Turborepo**, **Next.js 14 (App Router, TS)**, **Tailwind**, **shadcn/ui**, **Vitest**, and **ESLint/Prettier**. We will host on Vercel. Do not skip tests. Follow TDD: write a failing test first, then implement until green.

## Requirements

* Monorepo layout:

  ```
  .
  ├─ apps/web                  # Next.js 14, App Router, TS
  ├─ packages/shared           # shared TS utils, schemas, rule engine later
  ├─ .github/workflows/ci.yml  # CI: lint, typecheck, test, build
  ├─ turbo.json
  ├─ package.json (workspaces)
  ├─ tsconfig.base.json
  ```
* Node 20+, pnpm. Add `.nvmrc` with `v20`.
* Tailwind + shadcn/ui in `apps/web`. Install shadcn primitives we’ll use early: `button`, `card`, `table`, `badge`, `alert`, `select`, `input`.
* Vitest for unit tests in `packages/shared` and `apps/web` (component tests can come later).
* Prettier, ESLint (typescript, import, react), strict TS.
* `env.example` at repo root with placeholders:

  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  ```
* README with setup steps (pnpm, dev, test).

## TDD steps to perform

1. **Write a failing unit test** in `packages/shared`:

   * File: `packages/shared/src/math.spec.ts`
   * Test: imports `sum` from `./math` and expects `sum(2, 2)` to equal **5** (intentionally wrong).
2. Add Vitest config in `packages/shared` and root scripts to run tests across the monorepo.
3. Print the file tree and contents for all created files.
4. **Stop** and instruct me to run `pnpm install && pnpm test` to see the failure.
5. After I confirm, **fix the failure** by creating `packages/shared/src/math.ts` implementing a correct `sum(...nums:number[]):number` and update the test to assert **4**. Re-run tests (they should pass).
6. Create a minimal Next.js 14 app in `apps/web`, App Router with a dashboard shell:

   * `/app/layout.tsx` with Tailwind and a top nav
   * `/app/page.tsx` with a “Hello, Houston” card using shadcn components
   * Include a small component that imports `sum` from `packages/shared` and renders `sum(1,2,3)`
7. Add CI workflow `.github/workflows/ci.yml`:

   * Checkout → setup Node 20 → setup pnpm → cache → `pnpm i` → `pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm -w build`.
8. Provide **all** file diffs and final commands to run:

   * `pnpm dev --filter @app/web`
   * `pnpm test`

## Conventions

* Use `@repo/*` ts-path aliases. `@repo/shared` for the shared package.
* Use strict TypeScript everywhere.
* No placeholder TODOs—generate real code.

---

# Prompt 2 — Supabase plumbing (local + bucket + basic checks; tests first)

**Paste to Claude Code:**

Enhance the repo to integrate **Supabase** for Auth/DB/Storage. We will run Supabase locally for development via the CLI. Follow TDD: add a test that fails until env + bucket are configured.

## Tasks

1. Add Supabase CLI config:

   * Create `supabase/config.toml` (default ports).
   * Update root `package.json` scripts:

     * `"supabase:start": "supabase start"`
     * `"supabase:stop": "supabase stop"`
     * `"supabase:link": "echo 'Link in terminal: supabase link --project-ref XXX'"`
2. **Storage bucket**: create SQL migration to ensure a **private** bucket named `transactions`.

   * File: `supabase/migrations/0001_create_transactions_bucket.sql`
   * SQL should: create bucket if missing; bucket is **private** (no public reads).
3. Add a tiny Node utility to check Supabase env at runtime:

   * `packages/shared/src/supabaseEnv.ts` that throws if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing.
4. **Failing test first**: `packages/shared/src/supabaseEnv.spec.ts`

   * Temporarily clear `process.env` vars inside the test and assert that `supabaseEnv()` throws with a helpful message (so it fails until we set `.env`).
5. Provide `.env.example` (already added prior) but confirm it includes:

   ```
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=REPLACE_ME
   SUPABASE_SERVICE_ROLE_KEY=REPLACE_ME
   ```

   Add `env:load` script using `dotenv-cli` so tests can load `.env.local` automatically.
6. Generate a minimal server-only helper in `apps/web` to create an admin Supabase client using the **service role** key (for server actions later):

   * `apps/web/src/lib/supabaseAdmin.ts`
   * Safe: never bundle into client. Use `process.env.SUPABASE_SERVICE_ROLE_KEY`.
7. Print instructions to:

   * Run `pnpm supabase:start`
   * Copy Supabase local keys into `.env.local`
   * Run `pnpm test` to see the **supabaseEnv** test pass.

## Deliverables

* `supabase/config.toml`
* `supabase/migrations/0001_create_transactions_bucket.sql`
* `packages/shared/src/supabaseEnv.ts`
* `packages/shared/src/supabaseEnv.spec.ts`
* `apps/web/src/lib/supabaseAdmin.ts`
* Updated root `package.json` scripts

## Acceptance (TDD)

* `pnpm test` initially fails due to missing env → after adding `.env.local`, tests pass.
* After `pnpm supabase:start`, the migration runs (`supabase db reset` if needed) and the `transactions` bucket exists (private).

---

# Prompt 3 — Data model + multi-tenancy schema with RLS (tests first)

**Paste to Claude Code:**

Create the first DB schema for **organizations, memberships, transactions, files, reports, issues** with **Row-Level Security**. Follow TDD: write tests that prove cross-org data isolation.

## Schema (SQL migration)

Create `supabase/migrations/0002_core_schema.sql`:

Tables:

* `organizations(id uuid pk default gen_random_uuid(), name text not null, created_by uuid not null, created_at timestamptz default now())`
* `memberships(id uuid pk, org_id uuid not null, user_id uuid not null, role text check (role in ('broker_admin','agent','compliance')) not null, created_at timestamptz default now(), unique(org_id,user_id))`
* `transactions(id uuid pk, org_id uuid not null, title text, status text default 'draft', created_by uuid not null, created_at timestamptz default now())`
* `transaction_files(id uuid pk, tx_id uuid not null, org_id uuid not null, path text not null, kind text default 'contract', uploaded_by uuid not null, created_at timestamptz default now())`
* `reports(id uuid pk, tx_id uuid not null, org_id uuid not null, summary_json jsonb not null default '{}'::jsonb, created_at timestamptz default now())`
* `issues(id uuid pk, report_id uuid not null, rule_id text not null, severity text check (severity in ('critical','high','medium','low','info')), cite text, message text not null, details_json jsonb default '{}'::jsonb, created_at timestamptz default now())`

Helpers:

* SQL function `public.is_org_member(target_org uuid) returns boolean` that checks `exists(select 1 from memberships m where m.org_id = target_org and m.user_id = auth.uid())`.

RLS:

* Enable RLS on all org-scoped tables.
* Policies:

  * **organizations**: members can `select` where `is_org_member(id)`.
  * **memberships**: users can `select` their own membership rows; only `broker_admin` can `insert` members in their org.
  * **transactions**, `transaction_files`, `reports`, `issues`: allow `select/insert/update` where `org_id = org_id` **and** `is_org_member(org_id)`. (We’ll add stricter role-gating later.)

Indexes:

* `memberships(org_id, user_id)`, `transactions(org_id, created_at desc)`, `transaction_files(tx_id)`, `reports(tx_id)`, `issues(report_id)`.

## Seed + Test harness (Vitest)

Add `scripts/seed.ts` (Node/TS) that:

* Uses `@supabase/supabase-js` **service role** to:

  * Create two users: `agent1@example.com` and `agent2@example.com` with passwords and `email_confirm` true.
  * Create two orgs: `Org A`, `Org B`.
  * Insert memberships: agent1→Org A (role `agent`), agent2→Org B (role `agent`).
  * Insert one transaction in each org with `created_by` set to the respective user id.

Add `packages/shared/src/rls.spec.ts` that:

* Uses `createClient` with **anon** key and `signInWithPassword` to log in as **agent1** and **agent2**.
* As **agent1**, `select` from `transactions` and assert only the Org A transaction is visible.
* As **agent2**, assert only Org B transaction is visible.
* Attempt to `insert` a transaction into the **other** org and assert it **fails** with RLS error.

Utility:

* `packages/shared/src/supabaseTest.ts` with helpers to construct clients for anon and service role, loading env from `.env.local`.

## App wiring

* Add minimal server action in `apps/web`:

  * `src/app/actions/createOrg.ts` (server-only) that uses service role to insert an org and add current user as `broker_admin` (we’ll protect this later).
* Do **not** expose service role client to the browser.

## TDD flow

1. Generate migration + seed + tests. Show all files.
2. Instruct me to run:

   ```
   pnpm supabase:start
   supabase db reset
   pnpm tsx scripts/seed.ts
   pnpm test --filter @repo/shared
   ```

   Expect failures until policies are correct.
3. Implement/adjust policies until tests pass. Print final green output.

## Acceptance

* With tests, **agent1** cannot read **Org B** rows and vice-versa.
* Inserts into another org are blocked by RLS.
* The schema compiles; `supabase db reset` completes cleanly.

---

Want me to generate the next three (file upload pipeline, PDF parsing skeleton, normalized schema)?
