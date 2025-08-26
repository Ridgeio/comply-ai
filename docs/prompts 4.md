Totally—let’s unblock UI testing first. Here are three copy-pasteable prompts that add the **Transactions list & create flow**, the **Upload UI**, and the **Generate Report UI** (wired to your existing parsers/mappers if present; otherwise a safe stub so the page still works). All three are TDD-first.

---

# Prompt 7 — Transactions UI (list, create modal, view page) with server actions (tests first)

**Paste to Claude Code:**

You are my senior frontend engineer. Build the **Transactions** area so I can create and browse transactions from the UI. Follow **TDD** (write failing tests first).

## What to build

1. Navigation item **Dashboard | Transactions | Rules | Reports | Settings** (Transactions should be active).
2. **/transactions** (server component):

   * Table of transactions for the **current org** (id, title, status, created\_at).
   * “New Transaction” button → modal to create (title required).
3. **/transactions/\[txId]** (server component):

   * Header with title + status pill + org name.
   * Tabs: **Files**, **Report** (we’ll fill Files/Report in later prompts; put placeholders now).
4. **Server actions** (in `'use server'` files):

   * `listTransactionsForOrg(orgId)`
   * `createTransaction({ orgId, title })` → returns `txId`
   * `getTransaction(txId)`

> For **current org**, implement a util `getCurrentOrgId(userId)` that returns the first membership’s `org_id` (we’ll add a selector later).

## Files

* `apps/web/app/transactions/page.tsx`
* `apps/web/app/transactions/NewTransactionModal.tsx` (client component using shadcn/ui Dialog + Form)
* `apps/web/app/transactions/[txId]/page.tsx`
* `apps/web/src/app/transactions/actions.ts` (server actions)
* `apps/web/src/lib/org.ts` with `getCurrentOrgId(userId: string): Promise<string>`

## Tests first (RED)

* `apps/web/app/transactions/__tests__/transactions-ui.spec.tsx`

  * Render the list with mocked data → expect rows.
  * Simulate clicking “New Transaction”, fill title, submit → expect `createTransaction` called and navigation to detail page (mock `router.push`).

Use React Testing Library + Vitest.

## Implementation details

* Use shadcn **Card**, **Table**, **Badge**, **Dialog**, **Button**, **Input**.
* All Supabase reads/writes are **server-only**.
* Keep types strict; use your existing tables.

## Commands

1. Create files + tests; show diffs.
2. Ask me to run:

   ```
   pnpm test --filter @app/web
   ```

   (It should fail), then implement until green.
3. Manual check:

   * Visit `/transactions`, click **New Transaction**, create one, land on `/transactions/[txId]`.

## Acceptance

* I can create a transaction from the UI.
* I can see a list with correct data for my org.
* Tests for list + create pass.

---

# Prompt 8 — Files tab: drag-and-drop PDF upload + list + job status (tests first)

**Paste to Claude Code:**

Implement the **Files** tab UI on the transaction detail page so I can upload PDFs and see status immediately. Use the `uploadFiles` server action you created earlier (or create it now if missing). Follow **TDD**.

## What to build

1. **Files tab** at `/transactions/[txId]`:

   * Drag-and-drop area (multiple PDFs).
   * Client validates: `.pdf` only; size < 20MB; show per-file progress.
   * On success: show a table of files (name, uploaded\_by, created\_at) and latest `ingest_jobs.status` (Queued/Processing/Done/Error).
   * Buttons per file: **Generate Report** (wired next prompt), **View** (signed URL open in new tab).

2. **Server actions** (extend if needed):

   * `uploadFiles(txId, formData)` → stores to bucket (private), inserts `transaction_files` + `ingest_jobs(queued)`.
   * `listFilesWithJobStatus(txId)` → returns files joined with latest job status.
   * `getSignedUrl(path)` → short-lived signed URL for viewing.

3. **Client component**:

   * `apps/web/app/transactions/[txId]/FilesTab.tsx` (client) using shadcn **Dropzone**-style (use `react-dropzone` if available, or plain input with drag events).
   * Optimistic UI: add rows while upload in flight.

## Tests first (RED)

* `apps/web/app/transactions/[txId]/__tests__/files-ui.spec.tsx`

  * Render with mocked `listFilesWithJobStatus` → expect rows.
  * Simulate dropping two fake PDF `File` objects → expect `uploadFiles` called with both and UI shows “Queued”.

> For tests, stub server actions via module mocks.

## Implementation details

* Storage path uses your `buildStoragePath` helper from `packages/shared/src/storagePath.ts`.
* Show a “Scanned mode may reduce accuracy” banner if file has no AcroForm later (just placeholder copy now).
* All server actions `'use server'`; never leak service role key.

## Commands

1. Create files + tests; show diffs.
2. Run:

   ```
   pnpm test --filter @app/web
   ```

   Fix until green.
3. Manual:

   * Open `/transactions/[txId]` → **Files**.
   * Drag & drop a real small PDF; see it appear with status **Queued**; **View** opens via signed URL.

## Acceptance

* I can upload multiple PDFs from the UI.
* I can see file rows and their ingest status.
* I can open a signed view link.
* Tests pass.

---

# Prompt 9 — “Generate Report” end-to-end button (parse → map → rules) + Report tab UI (tests first)

**Paste to Claude Code:**

Add a **Generate Report** flow so I can click a button on the Files tab and land on a populated **Report** tab. If the parsers/mappers aren’t ready yet, include a **dev stub** so the UI still demonstrates the flow. Follow **TDD**.

## What to build

1. **Server actions**

   * `generateReport({ txId, primaryFileId })`

     * Loads the PDF bytes via Storage (admin client).
     * **If `@repo/parsers` + `@repo/shared` mappers exist**:

       * `toRawTrec20(buffer)` → `fromRawTrec20(raw)` → `runRules(typed, trec20Rules)` (and cross rules if present).
     * **Else (dev stub)**:

       * Build a minimal typed object with sane defaults and fabricate 3 issues (critical/high/low) so UI renders.
     * Insert a row into `reports` and child `issues` rows in one transaction.
     * Return `{ reportId, countsBySeverity }`.
   * `getLatestReportWithIssues(txId)` → returns latest report + issues for that tx.

2. **Files tab**

   * Add **Generate Report** button per file row that calls `generateReport` and `router.push('/transactions/[txId]?tab=report')`.

3. **Report tab UI** at `/transactions/[txId]`:

   * Components:

     * `ReportSummary` (counts, generatedAt)
     * `IssuesTable` (severity filters, search)
     * Buttons: **Regenerate**, **Download JSON**, **Copy Share Link** (share link can be a placeholder for now).
   * If there’s no report yet, show an empty state with a button to generate.

4. **Routing**

   * Use a `?tab=files|report` query to switch tabs (persist on refresh).

## Tests first (RED)

* `apps/web/tests/generate-report.flow.spec.ts`

  * Mock server actions:

    * `generateReport` returns counts `{critical:1,high:1,low:1}`.
    * `getLatestReportWithIssues` returns a fixed list.
  * Simulate clicking **Generate Report** in Files tab → expect navigation to Report tab and components render counts.
* `apps/web/app/transactions/[txId]/report/__tests__/report-components.spec.tsx`

  * Given issues, counts render properly; filtering hides non-selected severities; JSON download triggers a Blob (mock URL.createObjectURL).

## Implementation details

* Keep the Report components small and pure; pass props from server.
* Severity badge styles centralized in a `severity.ts`.
* For the JSON download, build `{ report, issues }` client-side and trigger download with a filename `report-${txId}.json`.

## Commands

1. Create files + tests; show diffs.
2. Run:

   ```
   pnpm test --filter @app/web
   ```

   Make it fail → implement until green.
3. Manual:

   * Upload a small PDF on Files tab.
   * Click **Generate Report**.
   * Land on **Report** tab with issues shown; try filter + JSON download.

## Acceptance

* I can generate a report from a file and view it on the Report tab.
* Counts by severity and filtering work.
* Works whether parsers are implemented or stubbed.
* Tests pass.

---

If you want, I can follow up with Prompts **10–12** (OCR fallback, Special Provisions AI pass, version/change tracking) once this UI is in and clickable.
