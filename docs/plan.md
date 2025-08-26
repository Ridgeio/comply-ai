Awesome—let’s turn this into a builder-grade plan you can march through in Cursor with Claude Code. Below is the **order of operations** broken into **work projects**. For each project I list:

* **Goal** (what done looks like)
* **Deliverables** (artifacts Claude will create)
* **Tests (TDD)** (the first failing tests you’ll write)
* **Prompt modules to prepare** (we’ll write these prompts next; this is just the checklist)

I’ll assume: **Next.js (App Router) on Vercel**, **Supabase (DB/Auth/Storage/Edge/Vector)**, **shadcn/ui** for a consistent React UI, **FastAPI** service optional (you can also keep it all in Next.js API routes; I’ll show both options where it matters).

---

## Project 0 — Repo, stack, and conventions

**Goal**: Single monorepo with web app, server, shared libs, and a clear testing setup.

**Deliverables**

* `apps/web` (Next.js 14+ App Router, TypeScript, Tailwind, shadcn/ui)
* `packages/shared` (schemas, rule-types, utilities)
* `.github/workflows/ci.yml` (lint + unit tests + typecheck + preview deploy)
* `.editorconfig`, `.prettierrc`, `eslint` config
* `env.example` with Vercel + Supabase vars

**Tests (TDD)**

* Lint and typecheck pass in CI
* A dummy unit test runs in `packages/shared`
* App builds locally and in a Vercel preview

**Prompt modules to prepare**

* “Create monorepo scaffolding with Turbo/PNPM (or NPM)”
* “Set up Next.js app with shadcn/ui + Tailwind + ESLint + Prettier”
* “Add shared package with TypeScript project references”
* “Create GitHub Actions CI for lint/build/test”
* “Generate env template and README bootstrap”

---

## Project 1 — Supabase plumbing

**Goal**: Auth + DB + Storage wired; local dev works with `supabase start`.

**Deliverables**

* Supabase project initialized; local config
* DB migrations folder
* Storage bucket `transactions` (private)
* RLS policies for multi-tenant orgs
* Edge functions placeholder (future OCR/LLM hooks)

**Tests (TDD)**

* Can sign in/out locally (email magic link or OAuth)
* RLS: user can only see their org’s rows
* Uploading a file requires auth and stores under `orgId/txId/…`

**Prompt modules**

* “Init Supabase and link to project; create buckets, RLS policies”
* “Define initial DB schema migrations”
* “Set up local dev scripts for Supabase”

---

## Project 2 — Data model & multi-tenancy

**Goal**: Organizations → Members → Transactions → Files → Reports.

**Deliverables**

* Tables: `organizations`, `memberships`, `users_profile`, `transactions`, `transaction_files`, `reports`, `issues`
* Enum types: `role` (`broker_admin`, `agent`, `compliance`)
* Constraints + indexes for org-scoped access

**Tests (TDD)**

* A `broker_admin` can create org and invite user
* `agent` can create a transaction in their org
* RLS blocks cross-org access

**Prompt modules**

* “Write SQL migration for org/membership/transaction schema”
* “Add Supabase RLS and row-level tests”
* “Seed script to create demo org and users”

---

## Project 3 — UI shell & auth flows

**Goal**: Logged-in experience with org switcher and basic nav.

**Deliverables**

* Auth pages (login, callback)
* Org switcher in the header; role badges
* Empty dashboards: Transactions, Upload, Settings

**Tests (TDD)**

* Redirect unauthenticated users to login
* Role-based visibility of nav items

**Prompt modules**

* “Scaffold dashboard layout with shadcn/ui”
* “Implement Supabase auth in Next.js (server components)”
* “Create org switcher and role gate components”

---

## Project 4 — File ingestion (PDF upload → storage → queue)

**Goal**: Upload contract PDFs into Supabase Storage and enqueue parsing job.

**Deliverables**

* Upload page: drag/drop multiple PDFs
* Server action: validates mime, stores under `orgId/txId/…`
* Job table `ingest_jobs` (status: queued/running/done/error)

**Tests (TDD)**

* Upload rejects non-PDF
* Private storage access works only for the org
* Creating a file creates an `ingest_jobs` row

**Prompt modules**

* “Build file upload UI + server action (App Router)”
* “Create `ingest_jobs` table and job enqueuer util”
* “Write storage access helpers with signed URLs”

---

## Project 5 — PDF parsing: AcroForm first, OCR later

**Goal**: Extract fields from **TREC 20-18** using form fields when present.

**Deliverables**

* A parsing micro-lib in `packages/shared/pdf`
* Extractor `trec_20_18_acroform.ts` that maps known field names → normalized schema
* Version detector (reads footer text)

**Tests (TDD)**

* Given a sample filled 20-18 (fillable), extractor returns normalized JSON
* Detector returns `20-18` with effective date, or “unknown”
* Fails gracefully on non-fillable (will be OCR later)

**Prompt modules**

* “Implement AcroForm extractor for TREC 20-18 (mapping file)”
* “Implement version detector (footer text and watermark heuristics)”
* “Write fixtures: ‘good’, ‘missing\_fields’, ‘wrong\_version’ PDFs (use placeholders initially and mark as pending until we add real blanks)”
* “Write unit tests for extractor and detector”

---

## Project 6 — Normalized JSON schema (“transaction model”)

**Goal**: Stable, typed shape that every check & UI depends on.

**Deliverables**

* `packages/shared/schemas/trec.ts` (zod or TypeScript types)
* `TransactionBundle` type: `{ forms: { trec20?: Trec20; … }, files: FileMeta[] }`
* Mapping layer from raw extractor → normalized schema

**Tests (TDD)**

* Parsing returns a `TransactionBundle` that passes zod parsing
* Invalid data fails with actionable errors

**Prompt modules**

* “Define zod schemas for trec20, addenda 40-11, 36-10, 39-10 (stubs)”
* “Build mapper from raw AcroForm fields to zod types”
* “Write negative tests for required fields”

---

## Project 7 — Rule engine v1 (deterministic)

**Goal**: Declarative checks with citations and severities.

**Deliverables**

* `packages/shared/rules/engine.ts`
* Rule spec: `{ id, description, severity, cite, predicate(bundle) }`
* Initial 25 rules for 20-18 (completeness, dates, math, version)

**Tests (TDD)**

* Each rule has **red/green** fixtures (one that triggers, one that doesn’t)
* Engine returns deterministic, ordered list of issues
* No rule exceeds a false-positive threshold in tests

**Prompt modules**

* “Create rule engine skeleton + types”
* “Author 25 starter rules for TREC 20-18”
* “Generate fixtures to hit each rule (+ counter-fixtures)”
* “Write engine unit tests and coverage targets”

---

## Project 8 — Report generator & UI

**Goal**: Human-friendly report with filters (severity/section), citations, and file links.

**Deliverables**

* `packages/shared/report/format.ts` (groups issues, totals)
* `/transactions/[id]/report` page with shadcn components (cards, table, filters)
* Export: PDF and shareable link (optional gate)

**Tests (TDD)**

* Rendering a bundle with issues shows counts by severity
* Clicking an issue reveals the field(s) referenced and the citation

**Prompt modules**

* “Build report formatter and table UI”
* “Add export to PDF (server-side)”
* “Write component tests with Playwright for basic flows”

---

## Project 9 — Add forms: 40-11, 36-10, 39-10

**Goal**: Cross-form consistency checks.

**Deliverables**

* AcroForm extractors for 40-11, 36-10, 39-10
* 15–25 new rules (addendum presence/consistency with 20-18)
* Updated bundles/tests

**Tests (TDD)**

* Missing required addendum triggers issue
* Conflicting amounts/dates across forms are flagged

**Prompt modules**

* “Implement extractor for 40-11, 36-10, 39-10”
* “Add rules: addendum presence & cross-field consistency”
* “Create fixtures: with/without specific addenda”

---

## Project 10 — OCR fallback (scanned PDFs)

**Goal**: Handle non-fillable scans with acceptable accuracy.

**Deliverables**

* Edge/OCR function (Supabase Edge Function or serverless API) calling Tesseract or AWS Textract
* Heuristics to find version text, names, dates, dollar amounts; Paragraph 11 text region
* Confidence scoring; “Scanned mode” banner in UI

**Tests (TDD)**

* Given a scanned sample, we recover version and key fields
* Low-confidence extraction triggers “needs manual review”

**Prompt modules**

* “Create OCR edge function and call from parser when AcroForm absent”
* “Implement text-region heuristics and confidence scores”
* “Write tests with scanned fixtures (golden JSON)”

---

## Project 11 — AI pass (limited, high-value)

**Goal**: Classify & summarize **Special Provisions (Paragraph 11)** and free-text addenda.

**Deliverables**

* Minimal LLM service (can be a Next.js API route) with two endpoints:

  * `POST /ai/classify-special-provisions` (few-shot classifier)
  * `POST /ai/extract-addendum` (schema: who/what/when/amount/deadline)
* Prompt + eval dataset (dozens of examples)
* Safety layer: never rewrite contract text, only summarize & flag risk levels

**Tests (TDD)**

* Deterministic test harness with seed & mock responses (snapshot tests)
* Classifier hits >80% precision on red-flag phrases in the eval set
* Extraction maps to the normalized schema and cross-links to rules

**Prompt modules**

* “Design few-shot prompts for Paragraph 11 classifier”
* “Design extraction prompt for unstructured addenda”
* “Build eval harness and scoring script”
* “Add integration tests tying AI output to rule engine warnings”

---

## Project 12 — Version & change tracking

**Goal**: Detect outdated forms and maintain a “forms registry”.

**Deliverables**

* `forms_registry` table with expected versions (e.g., `trec20: 20-18`)
* Nightly cron (Vercel/Edge) to check registry (manual update v1)
* Rule that flags mismatched versions

**Tests (TDD)**

* Changing a registry row causes tests to fail until fixtures are updated
* Detector reads the correct version from fixtures

**Prompt modules**

* “Create forms\_registry table + access lib”
* “Add a nightly scheduled function”
* “Extend rule set for version mismatch + tests”

---

## Project 13 — Observability & audit trail

**Goal**: Traceability for compliance officers.

**Deliverables**

* `audit_logs` table (who did what, when, on which tx)
* Structured logs for each rule fired (inputs, outputs, cite)
* “Explain” panel in UI for any issue (show predicate input snapshot)

**Tests (TDD)**

* Triggering a rule writes an audit row
* Export audit trail as JSON/CSV

**Prompt modules**

* “Add audit logger with server middleware”
* “Persist rule evaluations and expose explain panel”
* “Write tests for audit exports”

---

## Project 14 — Sharing & redaction

**Goal**: Share reports safely.

**Deliverables**

* Redaction function (names, emails, addresses) toggle
* Shareable link with access token + expiry
* Download sanitized PDF

**Tests (TDD)**

* Redaction removes PII from HTML/PDF exports
* Share link enforces expiry and scope

**Prompt modules**

* “Implement redaction pipeline and toggle”
* “Secure share links with signed params”
* “Add tests for PII removal”

---

## Project 15 — UX polish & role workflows

**Goal**: Broker admin / Agent / Compliance officer workflows.

**Deliverables**

* Agent: create tx, upload, get report, fix checklist
* Compliance: batch view across agents; filters by severity/date
* Broker admin: org settings (retention policy, weekend date warnings, etc.)

**Tests (TDD)**

* Role-specific E2E flows with Playwright
* Retention policy purges old files/reports (background job)

**Prompt modules**

* “Build role dashboards and filters”
* “Add retention policy job + tests”
* “Write E2E tests for each persona”

---

## Project 16 — Houston-specific checklists (non-legal)

**Goal**: Opinionated nudges for local norms (floodplain, HOA, PID, etc.).

**Deliverables**

* Configurable “Broker Checklist” that doesn’t give legal advice
* Rules tagged as “checklist” (informational severity)

**Tests (TDD)**

* Turning a checklist item on/off affects the report
* Copy explicitly avoids legal language

**Prompt modules**

* “Create checklist config model + UI”
* “Author initial Houston checklist items”
* “Write tests for checklist toggles and copy”

---

## Project 17 — Security, legal boundaries, and content policy

**Goal**: Stay out of UPL and respect form IP.

**Deliverables**

* In-product disclaimers (not legal advice; cite form paragraphs only)
* Block embedding/distribution of TXR forms (user-upload only)
* Data handling policy page; configurable retention defaults

**Tests (TDD)**

* Report footer contains disclaimers
* Attempt to render TXR form templates is blocked by feature flag

**Prompt modules**

* “Add disclaimers in UI and exports”
* “Feature flag + guard for TXR content”
* “Write tests that assert disclaimers exist”

---

## Project 18 — Billing & access (optional for MVP)

**Goal**: Stripe + seat-based orgs + per-file credits.

**Deliverables**

* Stripe products: per-file, seats
* Metering table and webhooks
* Paywall on upload and org settings

**Tests (TDD)**

* Webhook creates entitlements
* Upload blocked when out of credits

**Prompt modules**

* “Integrate Stripe and webhook handlers”
* “Add entitlement checks before upload”
* “Write billing tests with mock webhooks”

---

## Project 19 — Beta ops & feedback loop

**Goal**: Iterate with 3–5 Houston coordinators/compliance users.

**Deliverables**

* Feedback widget that ties to `issues` IDs
* Event tracking for false-positive/false-negative flags
* Weekly “rule noise” report

**Tests (TDD)**

* Flagging an issue stores FP/FN classification
* Noise report aggregates by rule ID

**Prompt modules**

* “Add feedback capture per issue”
* “Create weekly noise report job”
* “Write tests for feedback aggregation”

---

# Suggested repository structure

```
.
├─ apps/
│  └─ web/              # Next.js app
├─ packages/
│  ├─ shared/           # schemas, rule engine, utils
│  └─ parsers/          # pdf + ocr extractors
├─ supabase/
│  ├─ migrations/       # SQL migrations
│  └─ functions/        # edge functions (ocr/ai)
└─ .github/workflows/ci.yml
```

---

# Minimal initial DB schema (high level)

* `organizations(id, name, created_by)`
* `memberships(id, org_id, user_id, role)`
* `transactions(id, org_id, title, status, created_by)`
* `transaction_files(id, tx_id, org_id, path, type, source, uploaded_by)`
* `ingest_jobs(id, tx_id, file_id, status, error)`
* `reports(id, tx_id, org_id, created_at, summary_json)`
* `issues(id, report_id, rule_id, severity, cite, message, details_json)`
* `forms_registry(id, form_code, expected_version, effective_date)`
* `audit_logs(id, org_id, actor_id, action, target_id, payload_json)`

(With RLS policies keyed by `org_id`.)

---

# Testing strategy (how you’ll work day-to-day)

* **Start every task by writing/adjusting fixtures** (synthetic filled PDFs) that produce a specific failing test.
* Unit tests live beside rules & parsers; **each rule must have at least one red and one green test**.
* Playwright E2E covers: login, upload, report view, share, permissions.
* CI blocks merge if coverage < threshold on `packages/shared` and rule tests.

---

# Tooling calls you’ll reuse in prompts (meta)

When we write the actual Claude/Cursor prompts, we’ll reuse patterns like:

* “Create file(s) at path … with the following contents…”
* “Write SQL migration for … with RLS policies…”
* “Generate TypeScript zod schema for … with unit tests…”
* “Implement function … that passes these tests…”
* “Refactor module … to be pure and testable; no side effects…”
* “Add Playwright test for flow … with data-testids …”
* “Add CI job to run … and fail under coverage X…”

I’ll craft these as **repeatable prompt templates** (Build, Test, Refactor) for each project in the next step, exactly as you asked.

---

## Quick choices/opinions to lock now

* **UI kit**: Use **shadcn/ui** (great with Tailwind, composable primitives, easy to theme).
* **Server**: Keep everything in **Next.js API routes** for MVP simplicity; if you prefer Python for PDF/OCR, place it in a Supabase **Edge Function** or a tiny **FastAPI** service behind an internal route.
* **Rules**: Keep predicates **pure** and **declarative**; never reach out to the network.
* **OCR**: Ship v1 without OCR; enable after you’ve nailed AcroForm coverage and rule accuracy.

---

If this sequence works for you, I’ll write the **exact Claude Code prompt packs** per project next—down to file paths, test names, and acceptance criteria you can paste into Cursor and run.
