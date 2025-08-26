Love the screenshot—clean, legible, and very “ship it.” Let’s keep rolling. Here are the next three copy-pasteable prompts for Cursor/Claude Code.

---

# Prompt 7 — Deterministic Rule Engine v1 for TREC 20-18 (tests first)

**Paste to Claude Code:**

You are my senior engineer. Implement a **deterministic rule engine** that evaluates a typed `Trec20` object and returns a stable, explainable list of issues. Follow **TDD**: red tests first, then implement.

## Files to create

* `packages/shared/src/rules/types.ts`
* `packages/shared/src/rules/engine.ts`
* `packages/shared/src/rules/rules-trec20.ts`
* `packages/shared/src/rules/__tests__/engine.spec.ts`
* `packages/shared/src/rules/__tests__/rules-trec20.spec.ts`
* Helper factory for fixtures:

  * `packages/shared/src/test/factories.ts`

## Rule model

```ts
// types.ts
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type Issue = {
  id: string;              // e.g. "trec20.version.outdated"
  message: string;         // human-readable
  severity: Severity;
  cite?: string;           // paragraph reference, e.g. "TREC 20-18 ¶5"
  data?: Record<string, unknown>;
};

export type Rule<T> = {
  id: string;
  description: string;
  severity: Severity;
  cite?: string;
  predicate: (input: T) => boolean;  // returns true when a problem exists
  build?: (input: T) => Partial<Issue>; // allows dynamic message/data
};
```

## Engine

```ts
// engine.ts
import { Issue, Rule } from './types';

export function runRules<T>(input: T, rules: Rule<T>[]): Issue[] {
  const issues: Issue[] = [];
  for (const r of rules) {
    let isProblem = false;
    try { isProblem = r.predicate(input); } catch (e) {
      issues.push({
        id: `${r.id}.error`,
        message: `Rule threw: ${(e as Error).message}`,
        severity: 'low',
      });
      continue;
    }
    if (isProblem) {
      const base: Issue = {
        id: r.id,
        message: r.description,
        severity: r.severity,
        cite: r.cite,
      };
      issues.push({ ...base, ...(r.build?.(input) ?? {}) });
    }
  }
  return issues;
}
```

## Initial rule set for `Trec20` (25 rules)

Create `rules-trec20.ts` with **pure** predicates. Start with these (feel free to implement as separate small helpers):

1. **Version present**: missing `formVersion` → high (`trec20.version.missing`, cite `"Form footer"`).
2. **Version outdated**: `formVersion !== '20-18'` → high (`trec20.version.outdated`).
3. **Buyer required**: empty `buyerNames` → critical (`…¶1 Parties`).
4. **Seller required**: empty `sellerNames` → critical.
5. **Address street required**.
6. **Address city required**.
7. **Address state 2-letter**.
8. **ZIP min length**.
9. **Total price > 0**.
10. **Cash+Financed = Total** within tolerance **±\$1.00** (if both present).
11. **If financingType === 'cash' then financedPortionCents must be 0 or undefined**.
12. **If financingType !== 'cash' then financedPortionCents must be present and >0**.
13. **Effective date ≤ Closing date** (ISO compare).
14. **Option fee present ⇒ optionPeriodDays present**.
15. **Option period > 0** when fee present.
16. **Option end date before closing** (compute `effective + optionPeriodDays` < `closing`).
17. **Closing date not on weekend** (warn: `low`).
18. **Special provisions length ≤ 500 chars** (warn if longer; opinionated).
19. **Buyer & Seller names not identical** (basic mismatch).
20. **Total equals sum of parts when both parts present** (duplicate of #10 but assert both non-null; keep separate for clarity in messages).
21. **Currency sanity**: any cents values negative? → critical.
22. **Missing closing date** → high.
23. **Missing effective date** → medium.
24. **Whitespace-only names trimmed to empty** → treat as missing (covered by 3/4 but unit test explicitly).
25. **Address state uppercase** (auto-fix suggestion in `build`).

> Keep all messaging strictly informational; no legal advice.

## Tests to write first (RED)

* `engine.spec.ts`

  * Given a trivial rule that always flags, expect `runRules` to return that issue.
  * Given a rule that throws, engine returns an `.error` issue and continues.
* `rules-trec20.spec.ts`

  * Use a factory `makeTrec20()` to produce a valid baseline object.
  * Write **red/green** pairs for at least 10 rules (include #2, #10, #12, #13, #16, #17, #21).
  * For #10, use cents: `cash=500000`, `financed=29500000`, `total=30000000` (should pass).
  * For #13, assert that `2025-02-01` closing and `2025-01-03` effective passes; inverted fails.
  * For #16, compute option end: effective + 7 < closing (pass), else (fail).
  * Weekend: set closing to Saturday (fail as `low`).

Create `packages/shared/src/test/factories.ts`:

```ts
import { Trec20 } from '../schemas/trec';
export function makeTrec20(overrides: Partial<Trec20> = {}): Trec20 {
  return {
    buyerNames: ['Jane Buyer'],
    sellerNames: ['John Seller'],
    propertyAddress: { street: '123 Main', city: 'Houston', state: 'TX', zip: '77002' },
    salesPrice: { totalCents: 30000000, cashPortionCents: 500000, financedPortionCents: 29500000 },
    effectiveDate: '2025-01-03',
    closingDate: '2025-02-01',
    optionFeeCents: 20000,
    optionPeriodDays: 7,
    financingType: 'conventional',
    specialProvisionsText: '—',
    formVersion: '20-18',
    ...overrides,
  };
}
```

## Wire-up for later use

Export `runRules` and `trec20Rules` from `packages/shared/src/index.ts`.

## Instructions

1. Generate files and tests. Show diffs.
2. Tell me to run:

   ```
   pnpm test --filter @repo/shared
   ```

   Confirm failures, then implement until green.
3. After green, print an example of calling:

   ```ts
   import { runRules } from '@repo/shared/rules/engine';
   import { trec20Rules } from '@repo/shared/rules/rules-trec20';
   const issues = runRules(typedTrec20, trec20Rules);
   ```

## Acceptance

* All rule tests green.
* Engine resilient to thrown predicates.
* Issues contain stable IDs, severity, and optional `cite` strings.

---

# Prompt 8 — Report page (filters, counts, share, JSON export) + minimal server action to generate a report (tests first)

**Paste to Claude Code:**

Build the **Report UI** and a minimal server action that runs parsers → mapper → rule engine → saves a `reports` row + `issues` rows. Keep it simple and testable. Follow **TDD**.

## Files to create

* UI:

  * `apps/web/app/transactions/[txId]/report/page.tsx`
  * `apps/web/app/transactions/[txId]/report/IssuesTable.tsx`
  * `apps/web/app/transactions/[txId]/report/ReportSummary.tsx`
* Server actions:

  * `apps/web/src/app/transactions/[txId]/actions/generateReport.ts`
  * `apps/web/src/app/transactions/[txId]/actions/fetchReport.ts`
* Test (React + Vitest + Testing Library):

  * `apps/web/app/transactions/[txId]/report/__tests__/report-ui.spec.tsx`
* Integration test (Node/Vitest):

  * `apps/web/tests/generateReport.spec.ts`

## Behavior

* **generateReport(txId, primaryFileId)**:

  * Loads PDF bytes from Supabase Storage (use admin client).
  * Calls `toRawTrec20(buffer)` from `@repo/parsers`.
  * Calls `fromRawTrec20(raw)` from `@repo/shared`.
  * Runs `runRules(typed, trec20Rules)` from `@repo/shared`.
  * Inserts one `reports` row and N `issues` rows within a transaction.
  * Returns `{ reportId, countsBySeverity }`.

* **fetchReport(txId)**:

  * Returns latest report with its issues for the current org.

* **UI**:

  * `/transactions/[txId]/report`: shows `ReportSummary` (counts by severity, generatedAt), `IssuesTable` (filters by severity and search), and buttons:

    * “Regenerate Report” (calls `generateReport`)
    * “Download JSON” (client-side download of report+issues JSON)
    * “Copy Share Link” (creates a signed URL to view read-only—stub now)

* **Design**: shadcn/ui Cards, Badges for severity, Table with sticky header.

## Tests (write first)

* `report-ui.spec.tsx`:

  * Given a fake `issues` array, render `ReportSummary` and `IssuesTable`.
  * Expect counts (critical/high/medium/low/info) to display.
  * Filtering by severity updates the table rows.
* `generateReport.spec.ts`:

  * Stub Storage read to return a small synthetic PDF (use parsers’ test helper if available or a tiny buffer).
  * Stub `toRawTrec20` / `fromRawTrec20` to return a valid object.
  * Assert: DB inserts one report + N issues; returns correct counts.

## Implementation notes

* Keep server actions **server-only** (`'use server'`), never bundle service role key to client.
* Create a small helper `apps/web/src/lib/db.ts` with typed Supabase queries for `reports`/`issues`.
* Severity badge colors mapping lives in a single `severity.ts` file to keep consistent styling.

## Commands

1. Generate files/tests; show diffs.
2. Tell me to run:

   ```
   pnpm test --filter @app/web
   ```

   Make it fail, then implement until green.
3. Manual check:

   * Upload a PDF to a transaction.
   * Navigate to `/transactions/[txId]/report`, hit **Regenerate Report**, see issues.
   * Download JSON and open to verify structure.

## Acceptance

* UI renders counts and filters correctly (tests).
* Action writes `reports` + `issues` rows.
* No secret keys leak to client.
* Works with synthetic/small PDFs.

---

# Prompt 9 — Add parsers for 40-11, 36-10, 39-10 + cross-form consistency rules (tests first)

**Paste to Claude Code:**

Extend the system to parse key addenda and add **cross-form rules**. Keep AcroForm-first approach with synthetic PDFs in tests. Follow **TDD**.

## Schemas (zod) in `packages/shared/src/schemas/addenda.ts`

Create:

```ts
import { z } from 'zod';
import { MoneyCents, IsoDate } from './trec';

export const Trec40_11 = z.object({
  formVersion: z.string().optional(),
  loanType: z.enum(['conventional','fha','va','other']).optional(),
  loanAmountCents: MoneyCents.optional(),
  thirdPartyApprovalDeadline: IsoDate.optional(),
});

export const Trec36_10 = z.object({
  formVersion: z.string().optional(),
  isInPOA: z.boolean().optional(),
  transferFeeCents: MoneyCents.optional(), // if present
});

export const Trec39_10 = z.object({
  formVersion: z.string().optional(),
  amendedClosingDate: IsoDate.optional(),
  priceChangeCents: MoneyCents.optional(),
});

export type Trec40_11 = z.infer<typeof Trec40_11>;
export type Trec36_10 = z.infer<typeof Trec36_10>;
export type Trec39_10 = z.infer<typeof Trec39_10>;
```

Extend `TransactionBundle` in `schemas/trec.ts`:

```ts
forms: z.object({
  trec20: Trec20.optional(),
  trec40_11: Trec40_11.optional(),
  trec36_10: Trec36_10.optional(),
  trec39_10: Trec39_10.optional(),
})
```

## Parsers package

* `packages/parsers/src/trec40_11.ts`
* `packages/parsers/src/trec36_10.ts`
* `packages/parsers/src/trec39_10.ts`
* Each has:

  * `mapAcroformToRaw40_11(fields)` (and same for others)
  * `toRaw40_11(buffer)` that uses `readAcroForm` + `detectVersion`
* Synthetic PDF creators in tests similar to 20-18.

## Mappers

* `packages/shared/src/mappers/addenda.ts`

  * `fromRaw40_11(raw): Trec40_11`
  * `fromRaw36_10(raw): Trec36_10`
  * `fromRaw39_10(raw): Trec39_10`
  * Reuse `parseCurrencyToCents` and date normalization helpers.

## Cross-form rules (new file)

* `packages/shared/src/rules/rules-cross.ts`

  * R1: **If `trec20.financingType !== 'cash'` ⇒ require presence of `trec40_11`** (`critical`, cite `"20-18 ¶3–4 / 40-11"`).
  * R2: **If `trec20.financingType === 'cash'` ⇒ `trec40_11` should NOT be present** (`medium`).
  * R3: **If `trec39_10.amendedClosingDate` present ⇒ must be ≥ `trec20.effectiveDate` and ≥ original `closingDate`** (`high`).
  * R4: **If `trec36_10.isInPOA === true` ⇒ require **presence** of `trec36_10`** (sanity—low; acts as completeness check).
  * R5: **If both `trec40_11.loanAmountCents` and `trec20.salesPrice.totalCents` present ⇒ `loanAmountCents` ≤ total** (`medium`).

`runRules` already handles any generic `Rule<T>`. For cross-form, define an input type:

```ts
export type BundleForRules = {
  trec20?: Trec20;
  trec40_11?: Trec40_11;
  trec36_10?: Trec36_10;
  trec39_10?: Trec39_10;
};
```

Create `runAllRules(bundle: BundleForRules)` that runs `trec20` rules (if present) + cross rules.

## Tests (write first)

* Parsers: unit tests that synthetic PDFs map to expected raw objects for 40-11 / 36-10 / 39-10.
* Mappers: unit tests that valid raw → typed zod objects (money/date parsing).
* Cross rules: red/green for R1–R5 using a small factory:

  * `makeBundle({ trec20: {...}, trec40_11: {...} })`
  * Ensure the financing presence rules behave as expected.

## Wiring

* Export new addenda parsers/mappers from `@repo/parsers` and `@repo/shared`.
* Update `generateReport` action to:

  * Try to parse addenda if files are provided (for now, assume a single main contract; addenda optional).
  * Build a `BundleForRules` and call `runAllRules` (union of trec20 + cross rules).
* Update Report UI to group by **Category**: “Contract (20-18)”, “Financing (40-11)”, “POA (36-10)”, “Amendment (39-10)” using `issue.id` prefix.

## Commands

1. Create files/tests; show diffs.
2. Run:

   ```
   pnpm test --filter @repo/parsers
   pnpm test --filter @repo/shared
   pnpm test --filter @app/web
   ```

   Make it fail, then implement until green.
3. Manual:

   * Upload a contract with `financingType = conventional`.
   * Upload a dummy 40-11 synthetic PDF.
   * Generate report → verify a **critical** if 40-11 missing, otherwise no such issue.

## Acceptance

* Addenda parsers + mappers green on synthetic fixtures.
* Cross-form rules fire correctly.
* Report UI groups issues and still filters by severity.
* `generateReport` supports multi-file bundles.

---

When you’re ready, I’ll prep Prompts **10–12** (OCR fallback, AI pass for Special Provisions, and version/change tracking).
