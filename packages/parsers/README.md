# @repo/parsers

PDF parsing utilities for extracting AcroForm fields and detecting TREC form versions.

## Features

- Extract AcroForm field values from PDFs
- Detect TREC 20-18 version strings
- Map raw fields to normalized data structures

## Usage

### Extract Form Fields
```typescript
import { readAcroForm } from '@repo/parsers';

const pdfBuffer: Uint8Array = // ... load PDF
const fields = await readAcroForm(pdfBuffer);
// Returns: { 'FieldName': 'value', ... }
```

### Detect Version
```typescript
import { detectVersion } from '@repo/parsers';

const result = await detectVersion(pdfBuffer);
// Returns: { form: 'TREC-20', version: '20-18', effectiveDateText: '01/03/2025' }
```

### Map to TREC-20 Structure
```typescript
import { mapAcroformToRawTrec20 } from '@repo/parsers';

const fields = await readAcroForm(pdfBuffer);
const trec20Data = mapAcroformToRawTrec20(fields);
// Returns normalized RawTrec20 object
```

### Debug Server Action (Development Only)
```typescript
import { parseFileForDebug } from '@/app/actions/parseFileForDebug';

// Parse a file from Supabase storage
const result = await parseFileForDebug(fileId);
if (result.success) {
  console.log('Form fields:', result.formFields);
  console.log('Version info:', result.versionInfo);
  console.log('Field count:', result.fieldCount);
}
```

## Testing

```bash
pnpm test --filter @repo/parsers
```

## Field Mapping

The package maps these AcroForm field names to normalized properties:

- `Buyer1Name` → `buyer_names[0]`
- `Buyer2Name` → `buyer_names[1]`
- `PropertyStreet` → `property_address.street`
- `PropertyCity` → `property_address.city`
- `SalesPriceTotal` → `sales_price.total`
- And more...

See `src/mappings/trec20.acroform.ts` for the complete mapping.