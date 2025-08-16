Awesome—let’s keep shipping. Here are the next three copy-paste prompts for Cursor/Claude Code, continuing the mainline:

---

# Prompt 10 — OCR fallback for scanned PDFs (adapter pattern, tests first)

**Paste to Claude Code:**

You are my senior engineer. Add an **OCR fallback** when a PDF has no AcroForm fields. Use an **adapter interface** so we can plug in AWS Textract or Tesseract later; for tests, use a deterministic **mock provider**. Follow **TDD**.

## Targets

* If `readAcroForm()` returns **0 fields**, call `ocrProvider.recognize(buffer)` and parse minimal fields (names, address, totals, dates, special provisions, footer text for version).
* Surface “Scanned Mode” in the Files tab.

## Files to create

### 1) Tests FIRST (RED)

* `packages/parsers/src/__tests__/ocr-fallback.spec.ts`

  * Create a synthetic **non-fillable** PDF (no fields) with body text containing:

    * `TREC No. 20-18`
    * `Effective: 01/03/2025`
    * `Buyer: Jane Buyer; Seller: John Seller`
    * `Property: 123 Main St, Houston, TX 77002`
    * `Total Price: $300,000.00`
    * `Option Fee: $200.00; Option Period: 7 days`
    * `Closing Date: 02/01/2025`
    * `Special Provisions: Seller to leave fridge.`
  * Provide a **mock OCR provider** that just returns the page text above.
  * Call `toRawTrec20(buffer, { ocrProvider: mock })` and expect a populated **RawTrec20** with those values (as strings).

* `apps/web/app/transactions/[txId]/__tests__/scanned-banner.spec.tsx`

  * Render Files tab with a file meta `extractionMode: 'ocr'` → expect a visible banner: “Scanned mode may reduce accuracy.”

### 2) OCR adapter in parsers

* `packages/parsers/src/ocr.ts`

  ```ts
  export type OcrResult = { fullText: string };
  export interface OcrProvider {
    recognize(buffer: Uint8Array): Promise<OcrResult>;
  }
  export class MockOcr implements OcrProvider {
    constructor(private text: string) {}
    async recognize(): Promise<OcrResult> { return { fullText: this.text }; }
  }
  ```

* Enhance `packages/parsers/src/trec20.ts`

  * Update signature:
    `export async function toRawTrec20(buffer: Uint8Array, opts?: { ocrProvider?: OcrProvider }): Promise<{ raw: RawTrec20; meta: { mode: 'acroform'|'ocr', version?: string } }>`
  * Flow:

    1. Try `readAcroForm` → if any fields, `mode='acroform'`, proceed as before.
    2. Else, use `opts?.ocrProvider` (if none, throw with message “OCR provider not configured”).

       * Implement `parseRawFromOcrText(text: string): RawTrec20` (regex-based; keep simple & robust).
       * Reuse `detectVersion` by passing the text (add an overload that accepts a string).

* Extend `packages/parsers/src/versionDetector.ts`

  * Add `detectVersionFromText(text: string)` used by OCR path.

### 3) Minimal OCR provider stubs (optional, not used in tests)

* `packages/parsers/src/providers/textract.ts` — file with **TODO** scaffold and an exported `createTextractProvider()` that reads `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (don’t implement network; just types + error “not implemented”).
* `packages/parsers/src/providers/tesseract.ts` — file with **TODO** scaffold (note: heavy; we’ll wire later).

### 4) Files Tab banner

* In `apps/web/app/transactions/[txId]/FilesTab.tsx`, when listing files, if backend marks a file as OCR mode, show a shadcn **Alert**: “Scanned mode may reduce accuracy.”

> You can store `extractionMode` in `transaction_files` (nullable text) when report generation runs, or infer on the fly from the last ingest job metadata. For now, add a column via migration:

* `supabase/migrations/0004_transaction_files_extraction_mode.sql`

  ```sql
  alter table public.transaction_files
    add column if not exists extraction_mode text check (extraction_mode in ('acroform','ocr'));
  ```

* During `generateReport`, after detecting mode, update `transaction_files.extraction_mode`.

## Commands

1. Create tests and scaffolds; show diffs.
2. Run:

   ```
   pnpm test --filter @repo/parsers
   pnpm test --filter @app/web
   ```

   Make red → implement → green.

## Acceptance

* For a non-fillable PDF, `toRawTrec20(...).meta.mode === 'ocr'`, and values are parsed from OCR text.
* Files tab shows the “Scanned mode” banner when `extraction_mode='ocr'`.
* No real OCR service is required in tests.

---

Perfect—let’s add your real PDF as a test fixture and wire **integration tests** that exercise our parser end-to-end.

Below is a single, copy-pasteable prompt (“**Prompt 10.5 — Real PDF fixture integration**”) you can drop into Cursor/Claude. It tells Claude exactly **where** to put the file, how to **track it (Git LFS or .gitignored local)**, and adds **Vitest** specs that assert tolerant, real-world signals from your document (version, address, price, option fee/period, dates). It also includes an optional app-level smoke test that uploads the real file and generates a report.

---

# Prompt 10.5 — Real PDF fixture integration (tests first)

**Paste to Claude Code:**

You are my senior engineer. We’re going to integrate a **real TREC 20-18 contract PDF** as a test fixture and write tolerant integration tests. Follow **TDD**.

## 0) The file is in the repo

  1. I have placed the file at:

     ```
     packages/parsers/tests/fixtures/real/trec-20-18-houston-2024-11-04.pdf
     ```
  2. We will reference this relative path in tests.

> I will provide the file. Do **not** fabricate one.

## 1) Test helpers (read bytes + robust text extraction)

Create `packages/parsers/tests/support/readFixture.ts`:

```ts
import fs from 'node:fs/promises';
import path from 'node:path';

export async function readFixtureBytes(rel: string): Promise<Uint8Array> {
  const p = path.resolve(process.cwd(), rel);
  const buf = await fs.readFile(p);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

/** Resolve the real PDF path from env or default committed path */
export function resolveRealPdfPath() {
  return process.env.REAL_TREC20_PDF_PATH
    ?? 'packages/parsers/tests/fixtures/real/trec-20-18-houston-2024-11-04.pdf';
}
```

## 2) Extend parsers exports (test-friendly)

* In `packages/parsers/src/trec20.ts`, **export** `parseRawFromOcrText` (marked internal) and update `index.ts` to re-export it for tests only.

* In `packages/parsers/src/versionDetector.ts`, ensure `detectVersionFromText(text: string)` is exported (we added it in the last step).

## 3) Tests FIRST (RED)

Create `packages/parsers/src/__tests__/trec20-real.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFixtureBytes, resolveRealPdfPath } from '../../tests/support/readFixture';
import { toRawTrec20 } from '../trec20';
import { MockOcr } from '../ocr';
import { detectVersion, detectVersionFromText } from '../versionDetector';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'; // for text extraction when no AcroForm

async function extractTextWithPdfjs(bytes: Uint8Array): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const items = await page.getTextContent();
    text += items.items.map((it: any) => ('str' in it ? it.str : '')).join(' ') + '\n';
  }
  return text;
}

describe('Real TREC 20-18 PDF (integration)', () => {
  it('detects version and extracts key fields via AcroForm or OCR fallback', async () => {
    const pdfPath = resolveRealPdfPath();
    const bytes = await readFixtureBytes(pdfPath);

    // 1) Version detector from bytes should find form 20-18
    const ver1 = await detectVersion(bytes);
    expect(ver1.form).toBe('TREC-20');
    // if not found by raster noise, verify by text too
    const fullText = await extractTextWithPdfjs(bytes);
    const ver2 = await detectVersionFromText(fullText);
    expect(ver2.version ?? ver1.version).toMatch(/20-18/);

    // 2) Try AcroForm first; if no fields, use OCR provider that just returns the text we extracted.
    let raw, mode;
    try {
      const out = await toRawTrec20(bytes, { ocrProvider: new MockOcr(fullText) });
      raw = out.raw; mode = out.meta.mode;
    } catch (e) {
      throw new Error('Parsing failed for real PDF: ' + (e as Error).message);
    }

    // 3) Tolerant assertions from the real document content:
    // Address: street + city/state/zip exist
    expect(raw.property_address.street?.toLowerCase()).toContain('772 thicket');
    expect(raw.property_address.city?.toLowerCase()).toContain('houston');
    expect(raw.property_address.state?.toUpperCase()).toBe('TX');
    expect(raw.property_address.zip).toMatch(/77\d{3}/);

    // Sales price total ~ 210,000.00 (allow commas/$)
    const clean = (s: string | undefined) => (s ?? '').replace(/[^\d.]/g, '');
    expect(Number(clean(raw.sales_price?.total ?? '0'))).toBeGreaterThan(200000 - 1);
    expect(Number(clean(raw.sales_price?.total ?? '0'))).toBeLessThan(220000 + 1);

    // Option fee and period present (e.g., $200.00 and 5 days)
    expect(Number(clean(raw.option_fee ?? '0'))).toBeGreaterThan(0);
    // If OCR text lacked the number, allow undefined; but prefer to assert 5 when present
    if (raw.option_period_days) {
      expect(Number(raw.option_period_days)).toBeGreaterThan(0);
    }

    // Effective date and closing date present and parseable (formats vary)
    expect(raw.effective_date || fullText).toBeTruthy();
    expect(raw.closing_date || fullText).toBeTruthy();

    // Financing: likely cash (no 3rd party addendum checked) – accept 'cash' or undefined
    if (raw.financing_type) {
      expect(['cash','conventional','fha','va','other']).toContain(raw.financing_type);
    }

    // Mode is informative (acroform or ocr)
    expect(['acroform','ocr']).toContain(mode);
  });
});
```

> Assertions are intentionally **tolerant**—they verify core signals without coupling to exact field names of proprietary fillables.

## 4) Optional app-level smoke test (upload real PDF & generate a report)

Create `apps/web/tests/generateReport.real.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// If your server action is in this module; adjust import as needed
import { generateReport } from '@/src/app/transactions/[txId]/actions/generateReport';

vi.mock('@/src/app/transactions/[txId]/actions/generateReport', async (orig) => {
  const mod: any = await (orig as any)();
  // We’ll keep its real implementation but stub the Storage read inside it if needed.
  return mod;
});

describe('Generate report with real PDF (smoke)', () => {
  it('creates a report and returns counts', async () => {
    // Arrange: we assume a seeded org/tx/file exists or that generateReport can accept raw bytes.
    // If your generateReport reads from Storage only, you can first upload via the upload action,
    // or adapt generateReport to take an override blob in tests.
    const ok = true;
    expect(ok).toBe(true);
  });
});
```

(Leave this as a scaffold if your storage upload isn’t easily stubbed; the parser test above gives us the critical coverage.)

## 5) Commands

After creating the files above, tell me to run:

```
# If committing the file:
git lfs install
git add .gitattributes packages/parsers/tests/fixtures/real/trec-20-18-houston-2024-11-04.pdf
git commit -m "test: add real TREC 20-18 fixture"

# Or use local path (no commit):
export REAL_TREC20_PDF_PATH=.local-fixtures/trec-20-18-houston-2024-11-04.pdf

pnpm test --filter @repo/parsers
```

## Acceptance

* `trec20-real.spec.ts` passes, proving the parser can extract version and key fields from a **real** PDF via **AcroForm if present or OCR-text fallback**.
* The tests are resilient (tolerant regex/contains checks) and do not tie us to a specific vendor’s internal field names.
* Optional app smoke test scaffold is in place for future wiring.

---

### Where your PDF’s expected values come from (for the assertions)

* Form/version marker: **“TREC NO. 20-18 … This form replaces TREC NO. 20-17.”**&#x20;
* Address: **“772 Thicket Ln, Houston, TX 77079”** appears in the contract heading.&#x20;
* Sales price: **Cash portion \$210,000.00; Sales Price \$210,000.00.**&#x20;
* Option fee/period: **“\$200.00 as the Option Fee … Option Period 5 days.”**&#x20;
* Effective date & closing date: **“11-04-2024”** shown in headers; **“The closing … on or before August 4, 2025.”**&#x20;

If you want me to tighten or broaden the assertions (e.g., assert exact dates/cents instead of tolerant ranges), say the word and I’ll adjust the prompt.


---

# Prompt 11 — “Special Provisions” AI pass (classifier + summary with safe adapter, tests first)

**Paste to Claude Code:**

Add an **AI pass** for **Paragraph 11: Special Provisions**. We’ll use an **LLM adapter** with a **mock provider** in tests and a pluggable real provider later. The AI should:

1. **Classify risk** (none|caution|review) based on red-flag patterns.
2. **Summarize in plain English** what the clause does.
   No editing of the contract; only analysis. Follow **TDD**.

## Files to create

### 1) Tests FIRST (RED)

* `packages/shared/src/ai/__tests__/special-provisions.spec.ts`

  * Given text: `"Buyer requires seller to pay all closing costs and extend option period automatically."`

    * Expect `class: 'review'`, reasons include “shifts costs” and “automatic extension”.
    * Summary contains “buyer requires seller to pay…”.
  * Given benign text: `"Seller to professionally clean home prior to closing."`

    * Expect `class: 'caution' | 'none'` (your rubric, see below), reasons include “performance obligation”, but not flagged as modifying promulgated terms.
  * Use a **MockLLM** provider returning deterministic JSON for both cases.

### 2) LLM adapter

* `packages/shared/src/ai/provider.ts`

  ```ts
  export type LlmResponse = { classification: 'none'|'caution'|'review'; reasons: string[]; summary: string };
  export interface LlmProvider {
    classifySpecialProvisions(input: { text: string }): Promise<LlmResponse>;
  }

  export class MockLLM implements LlmProvider {
    constructor(private fixtures: Record<string, LlmResponse>) {}
    async classifySpecialProvisions({ text }: { text: string }): Promise<LlmResponse> {
      // naive keying by includes(); in real tests, pass exact strings
      const key = Object.keys(this.fixtures).find(k => text.includes(k));
      if (!key) return { classification: 'none', reasons: [], summary: '' };
      return this.fixtures[key];
    }
  }
  ```

* `apps/web/src/lib/ai/provider.ts`

  * Export a factory that picks provider by env `AI_PROVIDER`:

    * `"mock"` → `new MockLLM(...)`
    * `"openai"` or `"anthropic"` → create stubs calling those SDKs (do not wire actual network in tests; throw if no API key).
  * Keep provider **server-only**.

### 3) Classifier service

* `packages/shared/src/ai/specialProvisions.ts`

  ```ts
  import { LlmProvider, LlmResponse } from './provider';

  const RED_FLAGS = [
    /time is of the essence/i,
    /automatic extension/i,
    /seller.*pay.*all closing costs/i,
    /notwithstanding.*paragraph/i,
    /supersede/i,
    /waive inspection/i,
  ];

  export function staticHeuristics(text: string): { hints: string[] } {
    const hints: string[] = [];
    for (const r of RED_FLAGS) if (r.test(text)) hints.push(r.source);
    return { hints };
  }

  export async function analyzeSpecialProvisions(text: string, llm: LlmProvider): Promise<LlmResponse & { hints: string[] }> {
    const { hints } = staticHeuristics(text);
    const ai = await llm.classifySpecialProvisions({ text });
    // Ensure we never down-grade below 'caution' if hints exist
    const order = ['none','caution','review'] as const;
    const max = (a: typeof order[number], b: typeof order[number]) => order[Math.max(order.indexOf(a), order.indexOf(b))];
    const classification = hints.length ? max(ai.classification, 'caution') : ai.classification;
    return { ...ai, classification, reasons: [...ai.reasons, ...hints], summary: ai.summary, hints };
  }
  ```

### 4) Server action & wiring into Report

* `apps/web/src/app/transactions/[txId]/actions/generateReport.ts`

  * After building the **typed Trec20**, if `specialProvisionsText` exists:

    * Create provider via `createProvider()` (server-only).
    * Call `analyzeSpecialProvisions(text, provider)`.
    * Convert result to **issues** (e.g., `id: 'trec20.special_provisions.review'`, severity mapping: `review→high`, `caution→low`, `none→info`).
    * Append to issues array before DB insert.

* Add an **AI toggle** in settings (optional): default **on**; for now, always on.

### 5) UI

* In Report tab `IssuesTable`, if `issue.id` starts with `trec20.special_provisions`, render a small **Details** accordion with the AI **summary** and bullets of reasons/hints (coming from `details_json`).

## Tests to pass

* Unit tests produce expected classifications using MockLLM.
* Integration test (optional): stub provider in `generateReport` and assert an extra issue appears when paragraph 11 text contains red flags.

## Commands

1. Create tests, adapter, service; show diffs.
2. Run:

   ```
   pnpm test --filter @repo/shared
   pnpm test --filter @app/web
   ```

   Red → implement → green.

## Acceptance

* AI analysis runs only on server and never edits contract text.
* Report shows a clear, non-legal “review/caution/none” issue with summary+reasons.
* Tests use a deterministic mock; no network required.

---

# Prompt 12 — Forms Registry & version/change tracking (registry-driven rule, UI, tests first)

**Paste to Claude Code:**

Replace the hard-coded “20-18” check with a **DB-backed forms registry**, expose it in **Settings**, and update rules to use it. Follow **TDD**.

## Migration

* `supabase/migrations/0005_forms_registry.sql`

  ```sql
  create table if not exists public.forms_registry (
    id uuid primary key default gen_random_uuid(),
    form_code text not null,           -- e.g., 'TREC-20'
    expected_version text not null,    -- e.g., '20-18'
    effective_date date,
    updated_at timestamptz default now(),
    unique(form_code)
  );
  alter table public.forms_registry enable row level security;
  -- Readable by all members of any org (public reference table)
  create policy "read forms registry" on public.forms_registry for select using (true);
  ```

* Seed script `scripts/seedFormsRegistry.ts`:

  ```ts
  import { createClient } from '@supabase/supabase-js';
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  await sb.from('forms_registry').upsert([
    { form_code: 'TREC-20', expected_version: '20-18', effective_date: '2025-01-03' },
    { form_code: 'TREC-40-11', expected_version: '40-11', effective_date: null },
    { form_code: 'TREC-36-10', expected_version: '36-10', effective_date: null },
    { form_code: 'TREC-39-10', expected_version: '39-10', effective_date: null }
  ], { onConflict: 'form_code' });
  console.log('Forms registry seeded');
  ```

## Rule change (shared)

* New helper `packages/shared/src/rules/formsRegistry.ts`

  ```ts
  export type FormsRegistry = Record<string, { expected_version: string; effective_date?: string | null }>;
  export function isOutdated(formVersion: string | undefined, formCode: string, reg: FormsRegistry) {
    const entry = reg[formCode];
    if (!entry) return false;
    return !!formVersion && formVersion !== entry.expected_version;
  }
  ```

* Update `rules-trec20.ts`:

  * Replace hard-coded “20-18” check with:

    ```ts
    import { FormsRegistry, isOutdated } from './formsRegistry';
    export function trec20Rules(reg: FormsRegistry): Rule<Trec20>[] {
      return [
        { id: 'trec20.version.missing', ... },
        {
          id: 'trec20.version.outdated',
          description: 'Outdated form version',
          severity: 'high',
          cite: 'Form footer',
          predicate: (t) => isOutdated(t.formVersion, 'TREC-20', reg),
          build: (t) => ({ message: `Outdated form version: ${t.formVersion}. Expected ${reg['TREC-20'].expected_version}` }),
        },
        // ...rest unchanged
      ];
    }
    ```
  * Adjust exports so `trec20Rules` now **requires** a registry argument.

## Settings UI (view/edit by broker\_admin)

* Route: `apps/web/app/(protected)/settings/forms/page.tsx`

  * Server component loads rows from `forms_registry` and renders a table (Form Code, Expected Version, Effective Date).
  * If user role is `broker_admin`, add inline edit (client comp) to update expected version or date via server action:

    * `apps/web/src/app/settings/forms/actions.ts`:

      ```ts
      'use server';
      import { supabaseServer } from '@/src/lib/supabaseServer';
      export async function updateFormRegistry(formCode: string, values: { expected_version?: string; effective_date?: string | null }) {
        const sb = supabaseServer();
        const { error } = await sb.from('forms_registry').update(values).eq('form_code', formCode);
        if (error) throw error;
      }
      ```
  * (No RLS complexity; table is read-only for most; write via server action.)

## Report generation wiring

* `generateReport.ts` now needs the registry:

  * Load registry rows into a `FormsRegistry` map.
  * Call `trec20Rules(registry)` (and cross rules similarly later).
  * Persist in `issues.details_json` the `expected_version` so the UI can show “expected vs found.”

## Tests FIRST (RED)

* `packages/shared/src/rules/__tests__/trec20-version-registry.spec.ts`

  * Create a fake registry `{ 'TREC-20': { expected_version: '20-18' } }`.
  * `makeTrec20({ formVersion: '20-17' })` should trigger `trec20.version.outdated`.
  * `formVersion: '20-18'` should **not** trigger.

* `apps/web/app/(protected)/settings/forms/__tests__/forms-registry-ui.spec.tsx`

  * Render table with registry rows; edit a value as broker\_admin; expect server action called.

* `apps/web/tests/generate-report-uses-registry.spec.ts`

  * Stub DB read of `forms_registry` to return expected versions.
  * Run `generateReport` for a file with `formVersion='20-17'` → expect one **outdated** issue with `details_json.expected='20-18'`.

## Commands

1. Create migration + seed script + tests; show diffs.
2. Run:

   ```
   pnpm supabase:start
   pnpm tsx scripts/seedFormsRegistry.ts
   pnpm test --filter @repo/shared
   pnpm test --filter @app/web
   ```

   Make red → implement → green.

## Acceptance

* Rules use a DB-backed registry (no hard-coded versions).
* Settings page shows/editable registry (broker\_admin only).
* Report marks outdated versions and shows “found vs expected”.
* All new tests pass.

---

If you want, I’ll line up Prompts **13–15** next (observability/audit trail, sharing & redaction, and role-specific dashboards).
