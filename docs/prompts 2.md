Perfect—here are the next three, copy-pasteable prompts for Claude Code/Cursor. They pick up exactly where you are and keep the TDD rhythm.

---

# Prompt 4 — File upload pipeline (PDF → Storage → Job queue) with RLS-safe paths (tests first)

**Paste to Claude Code:**

You are my senior full-stack engineer. Implement the **file ingestion pipeline** for PDFs: UI upload → Supabase Storage (private) → enqueue an `ingest_jobs` row. Follow **TDD**.

## What to build

1. **DB migration** for a lightweight job queue:

   * Create `supabase/migrations/0003_ingest_jobs.sql`
   * Table `ingest_jobs`:

     ```
     id uuid pk default gen_random_uuid(),
     org_id uuid not null,
     tx_id uuid not null,
     file_id uuid not null,
     status text not null check (status in ('queued','processing','done','error')),
     error text,
     created_at timestamptz default now(),
     updated_at timestamptz default now()
     ```
   * Indexes: `(org_id, tx_id)`, `(status, updated_at desc)`
   * **RLS**: enable on table; policy to allow select/insert/update where `is_org_member(org_id)`.
   * Add trigger to update `updated_at` on write.

2. **Path strategy** (pure function so we can test):

   * New file: `packages/shared/src/storagePath.ts`
   * Export `buildStoragePath(params: { orgId: string; txId: string; originalName: string; now?: Date }): string`
   * Behavior:

     * Always return `transactions/${orgId}/${txId}/${yyyy}/${mm}/${dd}/${uuid}-${safeFileName}`
     * `safeFileName` = lowercased, spaces→`-`, strip non \[a-z0-9.\_-], ensure `.pdf`
     * Unit tests cover weird names (unicode, multiple dots) and stable date bucketing with injected `now`

3. **Server action** to upload:

   * New: `apps/web/src/app/transactions/[txId]/actions/uploadFiles.ts` (server)
   * Accept `FormData` with `files[]`
   * Validate: content-type must be `application/pdf`, size < 20MB
   * Use Supabase Admin client to `storage.from('transactions').upload(path, file)`
   * Insert `transaction_files` row (link to `txId`, `orgId`, path, kind='contract')
   * Insert `ingest_jobs` row with status `queued`
   * Return uploaded file metas

4. **Upload UI** (client):

   * Route: `apps/web/app/transactions/[txId]/upload/page.tsx`
   * Component: drag & drop zone (multiple PDFs), shows per-file status (queued/processing/etc.)
   * After upload, navigate to `/transactions/[txId]` and list recently uploaded files

5. **List files in transaction view**:

   * Add server component `apps/web/app/transactions/[txId]/page.tsx` with a table of `transaction_files` + latest job status for each

## TDD (write tests first)

* **Unit tests**

  * `packages/shared/src/storagePath.spec.ts`

    * Builds path with deterministic date (`now` injected)
    * Sanitizes `Original NAME (1).PDF` → `original-name-1.pdf`
    * Enforces `.pdf` extension even if `.Pdf` or none provided
* **Integration test (Node/Vitest)**

  * `apps/web/tests/uploadAction.spec.ts`

    * Mock a PDF `Blob` and call `uploadFiles` with a fake `orgId/txId`
    * Expect: (a) upload attempted with correct bucket+path, (b) `transaction_files` insert called, (c) `ingest_jobs` insert called with `queued`
    * Use dependency injection to stub Supabase clients so no network calls occur

## Dev ergonomics

* Add script: `"db:reset": "supabase db reset"` to root `package.json`
* Add script: `"migrate": "supabase db reset --no-seed && supabase db push"`

## Instructions

1. Generate all files and tests. Show the diff.
2. Tell me to run:

   ```
   pnpm supabase:start
   pnpm migrate
   pnpm test
   ```

   Expect failing tests until implementations are complete; then make them pass.
3. After green, print manual test steps:

   * Create a transaction (temporary server action or SQL)
   * Visit `/transactions/[txId]/upload`, drop a test PDF, verify file row + queued job.

## Acceptance

* Paths are deterministic and sanitized (tests prove).
* Upload rejects non-PDFs and >20MB.
* `transaction_files` + `ingest_jobs(queued)` rows are created atomically.
* RLS permits only members of `orgId`.

---

# Prompt 5 — PDF parsing package (AcroForm first) + Version detector for TREC 20-18 (tests first)

**Paste to Claude Code:**

Create a **parsers** package that extracts AcroForm fields from PDFs and detects the **TREC 20-18** version string. We’ll generate a synthetic fillable PDF in tests so we don’t need real forms. Follow **TDD**.

## Package skeleton

* New workspace: `packages/parsers`

  * `src/acroform.ts` — read AcroForm field names/values
  * `src/versionDetector.ts` — scan text for `TREC No. 20-18` and effective date patterns
  * `src/trec20.ts` — map raw fields → a **raw** normalized object (not zod yet)
  * Tests with **Vitest**
* Add dependency: `pdf-lib` for creating/reading form fields; `pdfjs-dist` (or `pdf-parse`) for text extraction. Prefer `pdf-lib` for fields, `pdfjs-dist` for text.

## Field mapping (initial guessable names)

We will standardize on these raw keys for 20-18:

```
RawTrec20 = {
  buyer_names: string[],
  seller_names: string[],
  property_address: { street: string; city: string; state: string; zip: string },
  sales_price: { cash_portion: string; financed_portion: string; total: string },
  effective_date?: string,   // mm/dd/yyyy or ISO
  closing_date?: string,
  option_fee?: string,
  option_period_days?: string,
  financing_type?: 'cash'|'conventional'|'fha'|'va'|'other',
  special_provisions_text?: string
}
```

Create a **mapping file** in `src/mappings/trec20.acroform.ts` that maps candidate form field names to these keys, e.g.:

```
'Buyer1Name' -> buyer_names[0]
'Buyer2Name' -> buyer_names[1]
'Seller1Name' -> seller_names[0]
'PropertyStreet' -> property_address.street
'PropertyCity' -> property_address.city
'PropertyState' -> property_address.state
'PropertyZip' -> property_address.zip
'SalesPriceTotal' -> sales_price.total
'SalesPriceCash' -> sales_price.cash_portion
'SalesPriceLoan' -> sales_price.financed_portion
'EffectiveDate' -> effective_date
'ClosingDate' -> closing_date
'OptionFee' -> option_fee
'OptionPeriodDays' -> option_period_days
'FinancingType' -> financing_type   // value set by a select/radio
'SpecialProvisions' -> special_provisions_text
```

(We’ll adjust names later; tests will use these names.)

## TDD — create synthetic PDFs on the fly

* Test helper `tests/support/makeTrec20Pdf.ts`:

  * Use `pdf-lib` to create a one-page PDF with the **above field names** as AcroForm fields; fill values from a test object.
  * Return a `Uint8Array` buffer for parsing tests.

## Implementations

1. `src/acroform.ts`

   * `readAcroForm(buffer: Uint8Array): Promise<Record<string,string>>` → returns a flat `{ fieldName: value }` map.
2. `src/versionDetector.ts`

   * `detectVersion(buffer: Uint8Array): Promise<{ form: 'TREC-20'|'unknown'; version?: string; effectiveDateText?: string }>`
   * Extract page text and match `/TREC\s+No\.\s*20-18/i` and an effective-date style like `Effective: 01/03/2025` or a nearby date.
3. `src/trec20.ts`

   * `mapAcroformToRawTrec20(fields: Record<string,string>): RawTrec20`
   * Use the mapping file; coalesce missing fields to `undefined` and array holes to `[]`.

## Tests to write first

* `packages/parsers/src/acroform.spec.ts`

  * Creates a synthetic PDF with 3 fields; expects `readAcroForm` to return all with correct values.
* `packages/parsers/src/versionDetector.spec.ts`

  * Creates a synthetic PDF with a text object containing `TREC No. 20-18` and `Effective: 01/03/2025`; expects correct detection.
* `packages/parsers/src/trec20.spec.ts`

  * Builds a synthetic PDF with the trec field names/values; expects `mapAcroformToRawTrec20` to produce the `RawTrec20` object (strings only).

## Wiring

* Add `@repo/parsers` ts-path alias; export public functions in `packages/parsers/src/index.ts`
* In `apps/web`, add a placeholder server action `parseFileForDebug` that, given a file from Storage, loads it into memory and runs `readAcroForm` + `detectVersion` (only for dev testing; not used in UI yet).

## Instructions

1. Create the package + tests; show files.
2. Tell me to run:

   ```
   pnpm install
   pnpm test --filter @repo/parsers
   ```

   Tests should fail initially → implement until green.
3. After green, print a short snippet showing how `parseFileForDebug` would be called (do not run network calls during tests).

## Acceptance

* Synthetic PDF tests pass consistently.
* We can extract AcroForm values and detect the `20-18` marker from text.
* Mapping produces a stable `RawTrec20` shape (strings only).

---

# Prompt 6 — Normalized JSON schemas (zod) + mapper from raw → typed domain model (tests first)

**Paste to Claude Code:**

Create the **domain schemas** (zod) and a **mapper** that converts `RawTrec20` (strings) into a typed, validated `Trec20` model with correct types (dates, money in cents, enums). Follow **TDD**.

## Schemas (zod) in `packages/shared/src/schemas/trec.ts`

* Implement:

  ```ts
  import { z } from 'zod';

  export const MoneyCents = z.number().int().nonnegative();
  export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/); // yyyy-mm-dd

  export const Address = z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().length(2),
    zip: z.string().min(5).max(10),
  });

  export const SalesPrice = z.object({
    cashPortionCents: MoneyCents.optional(),
    financedPortionCents: MoneyCents.optional(),
    totalCents: MoneyCents,
  });

  export const FinancingType = z.enum(['cash','conventional','fha','va','other']);

  export const Trec20 = z.object({
    buyerNames: z.array(z.string().min(1)).min(1),
    sellerNames: z.array(z.string().min(1)).min(1),
    propertyAddress: Address,
    salesPrice: SalesPrice,
    effectiveDate: IsoDate.optional(),
    closingDate: IsoDate.optional(),
    optionFeeCents: MoneyCents.optional(),
    optionPeriodDays: z.number().int().positive().optional(),
    financingType: FinancingType.optional(),
    specialProvisionsText: z.string().optional(),
    formVersion: z.string().optional(), // e.g., "20-18"
  });

  export const TransactionBundle = z.object({
    forms: z.object({
      trec20: Trec20.optional(),
      // addenda later
    }),
    files: z.array(z.object({
      id: z.string().uuid(),
      path: z.string(),
      kind: z.string(),
    })).optional(),
  });

  export type Trec20 = z.infer<typeof Trec20>;
  export type TransactionBundle = z.infer<typeof TransactionBundle>;
  ```
* Add a shared util `parseCurrencyToCents(value: string): number` in `packages/shared/src/money.ts`

  * Accepts `"1,234.56"` / `"$1,234.56"` / `"1234"` / `"0"` → returns **integer cents**
  * Rejects negatives and invalid formats with a thrown `Error`

## Mapper in `packages/shared/src/mappers/trec20.ts`

* `fromRawTrec20(raw: RawTrec20 & { formVersion?: string }): Trec20`

  * Convert names → arrays (strip blanks)
  * Normalize address (trim, uppercase state)
  * Convert currency strings → cents using `parseCurrencyToCents`
  * Convert `mm/dd/yyyy` → ISO (`yyyy-mm-dd`)
  * Validate with `Trec20.parse` and return typed object

## Tests (write first)

* `packages/shared/src/money.spec.ts`

  * Red/green: `"1,234.56" → 123456`, `"$2,000" → 200000`, `"0" → 0`
  * Expect throws on `"-1.00"`, `"12,34.56"`, `"abc"`
* `packages/shared/src/mappers/trec20.spec.ts`

  * Build a `RawTrec20` with strings:

    ```
    buyer_names: ["Jane Q Buyer",""],
    seller_names: ["John Seller"],
    property_address: { street:"123 Main St", city:"Houston", state:"tx", zip:"77002" },
    sales_price: { cash_portion:"5,000.00", financed_portion:"295,000.00", total:"300,000.00" },
    effective_date:"01/03/2025",
    closing_date:"02/01/2025",
    option_fee:"200.00",
    option_period_days:"7",
    financing_type:"conventional",
    special_provisions_text:"Seller to leave fridge."
    ```
  * Expect:

    * `buyerNames` = `["Jane Q Buyer"]` (blank stripped)
    * `propertyAddress.state` = `"TX"`
    * `salesPrice.totalCents` = `30000000`
    * `effectiveDate` = `"2025-01-03"`
    * `optionFeeCents` = `20000`
    * `optionPeriodDays` = `7`
  * Add a **negative test**: invalid currency throws; invalid date throws.

## Wiring with parsers

* In `packages/parsers/src/trec20.ts`, export `toRawTrec20(buffer)`:

  * Internally: `readAcroForm` → field map → `mapAcroformToRawTrec20`
  * Also call `detectVersion` and attach `formVersion` if found
* In `packages/shared/src/index.ts`, export schemas and mapper
* Optional dev action in `apps/web`:

  * `src/app/transactions/[txId]/actions/parseAndNormalize.ts`
  * Loads a file from Storage, calls `toRawTrec20` then `fromRawTrec20`, returns the typed object (dev only)

## Instructions

1. Create schemas, money util, mapper, and tests. Show all files.
2. Tell me to run:

   ```
   pnpm test --filter @repo/shared
   ```

   Confirm red tests → implement → green.
3. Add a short code snippet showing how `toRawTrec20` + `fromRawTrec20` compose (don’t execute network in tests).

## Acceptance

* Money parser is robust with commas, `$`, and decimals; errors on invalid/negative.
* Mapper returns a valid `Trec20` (ISO dates, cents, enums).
* Tests for schemas, money, and mapper all pass.
* Parsers package outputs `RawTrec20`; shared mapper produces typed `Trec20`.

---

When you’re ready, I’ll draft Prompts **7–9** (deterministic rule engine v1, report UI, and cross-form addenda parsers).
