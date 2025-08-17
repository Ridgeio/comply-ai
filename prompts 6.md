Awesome—let’s lock in the UI so everything from Prompts **10–12** is visible, clickable, and testable. Here are three copy-pasteable, Cursor/Claude-ready prompts that:

1. Finish the **Files** tab UX (progress, polling, OCR banner, errors).
2. Finish the **Report** tab UX (AI Special Provisions card, filters, details, exports).
3. Finish the **Settings → Forms Registry** UX (view/edit with role gating) and surface **version warnings** in the app.

---

# Prompt 13 — Files tab polish: progress, polling, OCR banner, signed-view, errors (tests first)

**Paste to Claude Code:**

You are my senior frontend engineer. Finish the Files tab so it’s production-usable. Follow **TDD**: create failing tests, then implement.

## What to build

* Drag/drop uploader shows **per-file progress** and disables while uploading.
* Background **polling** of `ingest_jobs` until status is `processing|done|error`.
* Badge for **Extraction Mode** (`AcroForm` or `Scanned (OCR)`), using `transaction_files.extraction_mode`.
* **Signed View** button opens the PDF in a new tab via short-lived signed URL.
* Clear **error toasts** (invalid type/size, upload or job failures).
* Empty-state UX when no files.

## Files & tests (RED first)

* `apps/web/app/transactions/[txId]/__tests__/files-tab.behavior.spec.tsx`

  * Mocks:

    * `uploadFiles` resolves with 2 files.
    * `listFilesWithJobStatus` initially returns `queued`, then `processing`, then `done`.
    * `getSignedUrl` returns `https://signed.example/test.pdf`.
  * Expectations:

    * After dropping files, rows appear with “Queued”, then “Processing”, then “Done” without reload (polling).
    * Clicking **View** opens a new tab (mock `window.open`).
    * If a file has `extraction_mode='ocr'`, an **Alert** banner is visible.

## Server actions (extend or add)

* `apps/web/src/app/transactions/[txId]/actions/uploadFiles.ts`

  * Return `{ files: { id, name, path, size, extraction_mode? }[] }`.
* `apps/web/src/app/transactions/[txId]/actions/listFilesWithJobStatus.ts`

  * Returns `{ files: [{ id, name, created_at, uploaded_by, extraction_mode, job: { status } }] }`.
* `apps/web/src/app/transactions/[txId]/actions/getSignedUrl.ts`

  * Given `path`, returns `{ url, expiresAt }`.

## Client implementation

* `apps/web/app/transactions/[txId]/FilesTab.tsx`

  * Use `react-dropzone` (if not present, add) or `<input type="file" multiple>`.
  * State machine per file: `idle → uploading → queued → processing → done|error`.
  * Poll every **3s** for up to **90s**; show spinner on `processing`.
  * Use shadcn **Alert** for OCR banner; **Badge** for status; **Toast** for errors.
* `apps/web/app/transactions/[txId]/UploadDropzone.tsx` (client)

  * Props: `onUpload(files: File[]): Promise<void>`
  * Validates `.pdf` and size `< 20MB` client-side; shows inline validation.

## Utilities

* `apps/web/src/lib/toast.tsx` — minimal shadcn toaster wired in root (if not already).

## Commands

1. Create tests and stubs → show diffs.
2. Run `pnpm test --filter @app/web` (red), then implement until green.
3. Manual: upload a small PDF, watch status advance, click **View**, see OCR banner when applicable.

## Acceptance

* Real uploads show progress → `Queued/Processing/Done/Error`.
* OCR files display the **Scanned mode** banner.
* Signed view works; errors surface via toasts.
* Tests pass.

---

# Prompt 14 — Report tab polish: AI Special Provisions card, rich issue details, filters, JSON/PDF export, regenerate UX (tests first)

**Paste to Claude Code:**

Finalize the **Report** tab UX to reflect AI analysis and make triage efficient. Follow **TDD**.

## What to build

* **Summary row**: counts by severity; last generated timestamp; “Regenerate” button (disabled & spinner while running).
* **Special Provisions Card** (when AI ran):

  * Header: “Paragraph 11 — Special Provisions”
  * Badge: `Review | Caution | None`
  * Short **summary** text + bullet list of **reasons/hints** from `details_json`.
* **Issues table** improvements:

  * **Filters**: severity chips (multi-select), category chips (“Contract 20-18”, “Financing 40-11”, “POA 36-10”, “Amendment 39-10”, “AI”).
  * **Search** textbox filters by `message` and `id`.
  * **Expandable rows** showing `details_json` in a tidy key→value list (and any citations).
  * **Copy** button (copies issue JSON to clipboard).
* **Exports**:

  * **Download JSON** of `{ report, issues }`.
  * **Download PDF** server-side (render SSR HTML to PDF; minimal, no branding needed for now).

## Files & tests (RED first)

* `apps/web/app/transactions/[txId]/report/__tests__/report-ui.behavior.spec.tsx`

  * Provide a fixture report with:

    * 1 critical (outdated version), 1 high (AI review), 1 low (weekend closing).
  * Expectations:

    * Summary counts render.
    * Filtering by `High` shows only the AI row.
    * Expanding the AI row renders its `summary` and `reasons/hints`.
    * Clicking **Download JSON** triggers a Blob download.
* `apps/web/tests/report-regenerate.spec.ts`

  * Mocks `generateReport` to resolve after a delay.
  * Clicking **Regenerate** disables button and shows spinner; after resolve, table updates.

## Server additions

* `apps/web/src/app/transactions/[txId]/actions/exportPdf.ts`

  * Given `reportId`, renders the same server component to HTML and converts to PDF (use `puppeteer-core` or `pdf-lib` HTML-to-PDF substitute; if heavy, stub implementation and return a small placeholder PDF for now).
* `apps/web/src/app/transactions/[txId]/actions/fetchReport.ts`

  * Already exists; ensure it returns `issues.details_json`.

## UI components

* `apps/web/app/transactions/[txId]/report/ReportSummary.tsx` (server)
* `apps/web/app/transactions/[txId]/report/SpecialProvisionsCard.tsx` (server)

  * Renders only if an issue id starts with `trec20.special_provisions`.
* `apps/web/app/transactions/[txId]/report/IssuesTable.tsx` (client)

  * Props: `{ issues: IssueDTO[] }`; handles chips, search, expand, copy.

## Styling

* Map severity → shadcn Badge variants consistently (`critical`=destructive, `high`=default, `medium`=secondary, `low`=outline, `info`=muted).

## Commands

1. Create tests/components/actions → show diffs.
2. Run `pnpm test --filter @app/web` (red) → implement until green.
3. Manual: generate a report with a file that includes Special Provisions text; verify card & filters; export JSON/PDF.

## Acceptance

* AI card appears with summary & reasons.
* Issues list is filterable/searchable and expandable.
* Regenerate UX is responsive; exports work (JSON now; PDF stub acceptable).

---

# Prompt 15 — Settings → Forms Registry UI (view/edit with role gating) + version warnings in app (tests first)

**Paste to Claude Code:**

Finish the UI for the **Forms Registry** introduced in Prompt 12, and surface **version warnings** where they matter. Follow **TDD**.

## What to build

1. **Settings page**

   * Route: `apps/web/app/(protected)/settings/forms/page.tsx`
   * Server component loads rows from `forms_registry` and current user’s role.
   * Table columns: Form Code, Expected Version, Effective Date, Updated.
   * If role is `broker_admin`, render inline **Edit** (client) with shadcn `Dialog`/`Form` to update `expected_version` or `effective_date` via server action.
   * Non-admins: read-only.

2. **Server action**

   * `apps/web/src/app/settings/forms/actions.ts`

     ```ts
     'use server';
     import { supabaseServer } from '@/src/lib/supabaseServer';
     export async function updateFormRegistry(formCode: string, values: { expected_version?: string; effective_date?: string | null }) {
       const sb = supabaseServer();
       const { error } = await sb.from('forms_registry').update(values).eq('form_code', formCode);
       if (error) throw error;
     }
     ```

3. **Version warning surfacing**

   * In the **Report** tab:

     * If an issue with id `trec20.version.outdated` exists, render a dismissible **Alert** at the top:

       * “Outdated form version detected. Expected X, found Y.” with a link **Settings → Forms**.
     * Also render a small **chip** next to the file name “Version: 20-17 (Outdated)”.
   * In the **Files** tab list, if we already detected form version for a file (from parsing meta), show a subtle **version chip**.

4. **Navigation**

   * Under **Settings**, add a sidebar/tab for **Forms Registry**.

## Tests (RED first)

* `apps/web/app/(protected)/settings/forms/__tests__/forms-registry-ui.spec.tsx`

  * As `broker_admin`, editing a row calls `updateFormRegistry`; values reflect after a refresh.
  * As non-admin, edit controls are hidden.
* `apps/web/app/transactions/[txId]/report/__tests__/version-warning.spec.tsx`

  * Given an outdated version issue with `details_json = { expected_version: '20-18', found: '20-17' }`, the Alert renders with the message and a link to Settings.

## Implementation details

* Role detection: reuse memberships in the protected layout; pass role into Settings page.
* Prefer server components for data fetch; client components only for interactive dialogs.
* Use shadcn **Table**, **Dialog**, **Form**, **Badge**, **Alert**.

## Commands

1. Create tests/components/actions → show diffs.
2. Run `pnpm test --filter @app/web` (red) → implement until green.
3. Manual:

   * Open Settings → Forms, edit `TREC-20` expected version; regenerate a report and confirm warning logic.

## Acceptance

* Forms Registry is viewable by all, editable by **broker\_admin** only.
* Reports clearly surface outdated versions with helpful links.
* Version chips appear on Files/Report where applicable.
* Tests pass.

---

If you want, next I can give you Prompts **16–18** to add **audit trail/Explain**, **share & redaction**, and **persona dashboards**—or we can pause and tighten any part of 13–15 first.
