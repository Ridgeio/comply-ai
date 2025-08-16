# Task: Create Parsers Package for PDF Form Processing

## Task Overview
Create a new `@repo/parsers` package that:
1. Extracts AcroForm fields from PDFs
2. Detects TREC 20-18 version strings
3. Maps raw fields to normalized data structures
4. Uses TDD with synthetic PDFs (no real forms needed)

## Monorepo Structure
- **Package Manager**: pnpm@8.15.1
- **Build Tool**: Turbo
- **Workspaces**: `apps/*` and `packages/*`
- **TypeScript**: Strict mode, ES2022 target
- **Testing**: Vitest
- **Package Naming Convention**: `@repo/[package-name]`

## Existing Conventions
From analyzing `packages/shared`:
- Main entry: `./src/index.ts`
- Test framework: Vitest with `globals: true`
- Scripts: `test`, `test:run`, `typecheck`, `lint`
- TypeScript config extends `../../tsconfig.base.json`
- Path aliases in `apps/web/tsconfig.json` format: `"@repo/parsers": ["../../packages/parsers/src"]`

## Package Requirements

### Dependencies
- `pdf-lib`: For creating/reading AcroForm fields
- `pdfjs-dist`: For text extraction

### Source Files Structure
```
packages/parsers/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts (exports)
│   ├── acroform.ts
│   ├── versionDetector.ts
│   ├── trec20.ts
│   ├── types.ts (RawTrec20 interface)
│   └── mappings/
│       └── trec20.acroform.ts
└── tests/
    ├── support/
    │   └── makeTrec20Pdf.ts
    ├── acroform.spec.ts
    ├── versionDetector.spec.ts
    └── trec20.spec.ts
```

### Data Model
```typescript
interface RawTrec20 {
  buyer_names: string[];
  seller_names: string[];
  property_address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  sales_price: {
    cash_portion: string;
    financed_portion: string;
    total: string;
  };
  effective_date?: string;
  closing_date?: string;
  option_fee?: string;
  option_period_days?: string;
  financing_type?: 'cash' | 'conventional' | 'fha' | 'va' | 'other';
  special_provisions_text?: string;
}
```

### Field Mapping
Map AcroForm field names to RawTrec20 properties:
- `Buyer1Name` → `buyer_names[0]`
- `Buyer2Name` → `buyer_names[1]`
- `Seller1Name` → `seller_names[0]`
- `PropertyStreet` → `property_address.street`
- `PropertyCity` → `property_address.city`
- `PropertyState` → `property_address.state`
- `PropertyZip` → `property_address.zip`
- `SalesPriceTotal` → `sales_price.total`
- `SalesPriceCash` → `sales_price.cash_portion`
- `SalesPriceLoan` → `sales_price.financed_portion`
- `EffectiveDate` → `effective_date`
- `ClosingDate` → `closing_date`
- `OptionFee` → `option_fee`
- `OptionPeriodDays` → `option_period_days`
- `FinancingType` → `financing_type`
- `SpecialProvisions` → `special_provisions_text`

### Core Functions

1. **acroform.ts**
   - `readAcroForm(buffer: Uint8Array): Promise<Record<string,string>>`
   - Returns flat map of field names to values

2. **versionDetector.ts**
   - `detectVersion(buffer: Uint8Array): Promise<{ form: 'TREC-20'|'unknown'; version?: string; effectiveDateText?: string }>`
   - Uses regex `/TREC\s+No\.\s*20-18/i`
   - Looks for effective date patterns

3. **trec20.ts**
   - `mapAcroformToRawTrec20(fields: Record<string,string>): RawTrec20`
   - Uses mapping file
   - Handles missing fields gracefully

### Test Strategy (TDD)
1. Write failing tests first
2. Use synthetic PDFs created on-the-fly with `pdf-lib`
3. Test helper `makeTrec20Pdf.ts` creates PDFs with known field values
4. Tests verify extraction, detection, and mapping

### Integration Points
1. Add `@repo/parsers` to apps/web dependencies
2. Update apps/web tsconfig.json paths
3. Create `parseFileForDebug` server action (development only)

## Implementation Steps
1. ✅ Explore monorepo structure
2. Create parsers package skeleton
3. Write failing tests first
4. Implement acroform.ts
5. Implement versionDetector.ts  
6. Implement trec20.ts with mapping
7. Wire to monorepo
8. Create parseFileForDebug action

## Key Decisions
- Use `pdf-lib` for AcroForm field manipulation (simpler API)
- Use `pdfjs-dist` for text extraction (more reliable for text content)
- Generate synthetic PDFs in tests to avoid dependencies on real forms
- Keep initial implementation focused on strings only (no Zod validation yet)
- Follow existing monorepo conventions for consistency