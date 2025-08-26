# Claude.md - Comply AI Development Guide

## Project Overview

Comply AI is a production-ready compliance platform for analyzing Texas Real Estate Commission (TREC) forms and contracts. The system processes PDF documents, extracts structured data, runs compliance checks, and generates detailed reports highlighting potential issues and special provisions.

## MCP
You have the Supabase MCP to make chagnes to the project's Supabase configurations - use it whenever necessary.

## Tech Stack

### Core Technologies
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL with RLS)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Testing**: Vitest with React Testing Library
- **Monorepo**: pnpm workspaces + Turborepo
- **Runtime**: Node.js 20+

### Architecture
- **apps/web**: Main Next.js application
- **packages/parsers**: PDF parsing and OCR logic
- **packages/shared**: Business logic, rules engine, utilities

## Key Commands

```bash
# Development
pnpm dev             # Next.js dev server (apps/web)
pnpm build           # Turborepo build all packages
pnpm lint            # Run ESLint
pnpm typecheck       # TypeScript type checking
pnpm format          # Format code with Prettier

# Testing
pnpm test            # Vitest watch mode
pnpm test:run        # Vitest run once
pnpm test:env        # Run with environment variables

# Database
pnpm supabase:start  # Start local Supabase
pnpm supabase:stop   # Stop local Supabase
pnpm migrate         # Push/reset migrations
pnpm db:reset        # Reset database with seed

# Package-specific commands
pnpm test --filter @repo/parsers
pnpm test --filter @repo/shared
pnpm test --filter @app/web
```

## Dev Onboarding - Quick Start

```bash
# Initial setup
pnpm i
pnpm supabase:start
pnpm migrate
pnpm tsx scripts/seedFormsRegistry.ts
pnpm dev

# First sign-in flow:
# 1. Create account → 2. Onboarding → 3. Create org 
# 4. Create transaction → 5. Upload test PDF → 6. Generate report
```

## Routes & Authentication

### Route Groups
- **Public Routes**: `(public)/auth/*` (sign-in/sign-up), `(public)/share/[token]`
- **Protected Routes**: `(protected)/*` - everything else, gated by `middleware.ts` + `requireUser()`
- **Root**: `/` redirects to `/dashboard` (authenticated) or `/auth/sign-in` (unauthenticated)

### Organization Context
- `requireCurrentOrg()` reads `activeOrgId` cookie or first membership
- If no org → redirects to `/onboarding`
- Org Switcher component in protected layout header

## Database Entities (RLS)

### Core Tables
- **organizations**: Multi-tenant organizations
- **memberships**: User-organization relationships
- **transactions**: Real estate transactions
- **transaction_files**: Uploaded documents with extraction mode
- **ingest_jobs**: Processing queue
- **reports**: Compliance analysis results with ruleset version
- **issues**: Individual compliance issues from reports
- **forms_registry**: Expected form versions
- **audit_logs**: Activity tracking
- **share_links**: Read-only expiring report shares
- **issue_feedback**: User feedback on issues
- **org_settings**: Organization preferences

### Row Level Security (RLS)
All tables have RLS enabled. Users can only access data from their organization through membership verification.

## Environment Variables

### Complete List
```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App Config
NEXT_PUBLIC_SITE_URL=                # For redirects and emails
PDF_MAX_MB=20                        # Max PDF upload size
TRANSACTIONS_BUCKET=transactions     # Storage bucket name

# AI Providers
AI_PROVIDER=mock|openai|anthropic    # Choose provider
OPENAI_API_KEY=                      # If AI_PROVIDER=openai
ANTHROPIC_API_KEY=                   # If AI_PROVIDER=anthropic

# Maintenance
RETENTION_SECRET=                    # For retention cron endpoint

# Optional Services
SENTRY_DSN=                          # Error tracking
AWS_REGION=                          # For Textract OCR
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Test Fixtures (Development)
REAL_TREC20_PDF_PATH=                # Path to real PDF for testing
```

### Environment Setup
- **Local**: Copy to `.env.local` in project root
- **Vercel**: Set in project settings under Environment Variables

## Code Conventions

### File Organization
- Server actions go in `actions/` folders
- Components use PascalCase (e.g., `IssuesTable.tsx`)
- Hooks and utilities use camelCase
- Tests live in `__tests__/` folders next to components

### TypeScript Patterns
```typescript
// Always use 'use server' for server actions
'use server';

// Import types from shared package
import type { Database } from '@repo/shared/types/supabase';

// Prefer named exports for components
export function ComponentName() { }

// Use async/await for all database operations
const { data, error } = await supabase
  .from('table')
  .select('*')
  .single();
```

### Error Handling
```typescript
// Always return success/error objects from server actions
return {
  success: false,
  error: 'Descriptive error message'
};

// Check authentication and authorization
const orgId = await requireCurrentOrg();
if (!orgId) {
  return { success: false, error: 'Not authenticated' };
}
```

### Component Patterns
- Use React Server Components by default
- Mark client components with `'use client'`
- Use shadcn/ui components from `@/components/ui/`
- Follow existing Radix UI patterns for new components

## File Processing Flow

1. User uploads PDF to transaction
2. File stored in Supabase storage (`transactions` bucket)
3. Ingest job created for processing
4. PDF parsed (with OCR fallback if needed)
5. Data extracted to TREC format
6. Compliance rules run
7. Report generated with issues and ruleset version

## Testing Strategy

### Test File Types
- `*.spec.ts` - Unit/integration tests
- `*.spec.tsx` - Component tests  
- `*.behavior.spec.tsx` - User interaction tests
- `*.simple.spec.tsx` - Minimal component tests
- `*.real.spec.ts` - Tests using real fixtures (env gated)

### Coverage Targets
- **packages/shared**: 80% (rules and mappers)
- **packages/parsers**: 80% (field extraction)
- **apps/web**: 60% (critical paths)

### Running Tests
```bash
# All tests
pnpm test:run

# Specific package
pnpm test:run --filter @app/web

# With environment variables
pnpm test:env

# Real fixture tests (requires REAL_TREC20_PDF_PATH)
REAL_TREC20_PDF_PATH=/path/to/pdf pnpm test
```

## How-To Playbooks

### Adding a New Rule

1. **Create rule file** in `packages/shared/src/rules/`
   - Use ID convention: `trec20.section.slug` or `cross.form.slug`
   - Include `cite` paragraph reference
   - Set appropriate `severity` level
   - Add minimal `debug()` snapshot for Explain feature

2. **Write tests** with red/green cases
   ```typescript
   // Test that fires
   expect(rule.check(invalidData)).toHaveIssue();
   // Test that passes
   expect(rule.check(validData)).not.toHaveIssue();
   ```

3. **Update rule engine**
   - Add to `runAllRules()` if cross-form rule
   - Bump ruleset version (e.g., `2025.08.24-1`)

4. **Document the rule**
   - Add to rule documentation
   - Update changelog

### Adding a Form/Addendum Parser

1. **Create field mappings** in `packages/parsers/src/mappings/`
   ```typescript
   export const FORM_FIELD_MAPPINGS: FieldMapping[] = [
     { fieldName: 'BuyerName', path: ['buyer_names'], arrayIndex: 0 },
     // ...
   ];
   ```

2. **Define data flow**
   - AcroForm fields → raw extraction → Zod schema → typed mapper

3. **Add tests with fixtures**
   - Synthetic PDF fixtures first
   - Real fixture behind env guard
   - Test OCR fallback paths

4. **Update Forms Registry**
   ```sql
   INSERT INTO forms_registry (form_code, expected_version, effective_date)
   VALUES ('TREC-20', '20-18', '2024-01-01');
   ```

### Handling Form Version Updates

1. **Update Forms Registry** when TREC publishes new version
2. **Run seed script**: `pnpm tsx scripts/seedFormsRegistry.ts`
3. **Add version-specific rules** if needed
4. **Test with old and new versions**

## Domain Knowledge

### TREC Forms
- **TREC 20-18**: Current standard residential contract (check Forms Registry for latest)
- Contains buyer/seller info, property details, pricing, dates
- Special provisions are free-text fields requiring AI analysis
- Form versions tracked in `forms_registry` table

### Compliance Checks
- Missing required fields
- Date inconsistencies  
- Price calculation errors
- Special provision risks
- Form version mismatches

## Ruleset Versioning

Each generated report stores:
- `ruleset_version`: string (format: `YYYY.MM.DD-n`)
- `forms_registry_snapshot`: JSONB of expected versions at runtime
- `formVersion`: detected from the document

This guarantees reproducibility - reports generated in March can be re-validated with the same rules later.

## Share Links & Redaction

- **Endpoint**: `/share/[token]` - read-only, expiring view
- **Default redaction**: Emails and addresses hidden server-side
- **Management**: Create via share button, revoke in settings
- **Expiration**: Configurable, default 30 days

## Retention Policy

- **Default**: 60 days for files and reports
- **Endpoint**: Protected maintenance endpoint with `RETENTION_SECRET`
- **Schedule**: Vercel Cron daily at 2 AM UTC
- **Scope**: Deletes old files, reports, and audit logs

## Observability

### Audit Log Actions
- `upload.file` - File upload to transaction
- `report.generate` - Report generation
- `rule.fire` - Individual rule violations
- `share.create` - Share link created
- `share.revoke` - Share link revoked
- `feedback.submit` - Issue feedback

### Debug & Explain
- Rules include `debug` payloads showing inputs
- Explain drawer in UI shows rule logic and citations
- Sentry integration ready (set `SENTRY_DSN`)

## Legal Boundaries

⚖️ **Important Disclaimers**:
- Not legal advice - analysis is informational only
- Cite form paragraphs for reference, not interpretation
- Don't redistribute TXR forms - members upload their own
- Disclaimers appear in: report footer, share view header, empty states

## PDF Processing Caveats

### Limitations
- **Memory/time limits**: Serverless constraints (~10MB, 60s)
- **Large PDFs**: May timeout or exceed memory
- **Rotated pages**: OCR may struggle
- **Scan quality**: Variable OCR accuracy

### Fallback Behavior
- Automatic OCR mode when AcroForm fails
- UI banner shows extraction mode
- Reduced rule coverage in OCR mode
- Best effort field extraction

## Security Checklist

### Before Merge
- ✅ No service role key reaches client
- ✅ All storage downloads use signed URLs
- ✅ Server actions validate `org_id` via `requireCurrentOrg()`
- ✅ PDF uploads validated for:
  - MIME type checking
  - Size cap (`PDF_MAX_MB`)
  - Filename sanitization
  - No directory traversal

### Authentication Flow
1. Supabase Auth handles user accounts
2. Middleware enforces authentication
3. `requireCurrentOrg()` ensures org context
4. RLS policies enforce data isolation

## Deployment

### Vercel Configuration
- **Framework Preset**: Next.js
- **Build Command**: `pnpm build --filter @app/web`
- **Output Directory**: `apps/web/.next`
- **Install Command**: `pnpm install`
- **Node Version**: 20.x
- **Environment Variables**: Set all required vars
- **Monorepo**: Include `turbo.json`

### Preview Environments
- Seed forms registry on first deploy
- Use preview-specific Supabase project
- Set `NEXT_PUBLIC_SITE_URL` to preview URL

### Production Checklist
1. All environment variables set
2. Supabase migrations applied
3. Forms registry seeded
4. Storage bucket created
5. RLS policies enabled
6. Retention cron configured

## Code Quality

### Pre-commit Hooks
```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

### CODEOWNERS
```
# .github/CODEOWNERS
/packages/shared/src/rules/ @compliance-team
/packages/parsers/ @parsing-team
```

## Debugging Tips

1. **RLS Issues**: Check Supabase logs, verify org membership
2. **Upload Failures**: Check file size, storage bucket permissions
3. **Report Generation**: Verify ingest job status, check parser logs
4. **Auth Problems**: Clear cookies, check `activeOrgId`
5. **Test Locally**: Use `pnpm supabase:start` for isolated testing

## File References

Key files to understand the codebase:
- `apps/web/src/app/transactions/[txId]/actions/generateReport.ts` - Report generation
- `packages/shared/src/rules/rules-trec20.ts` - Compliance rules
- `packages/parsers/src/trec20.ts` - PDF parsing logic
- `apps/web/src/lib/db.ts` - Database helpers
- `apps/web/middleware.ts` - Auth middleware
- `supabase/migrations/` - Database schema evolution

## Notes for Future Development

- System designed for extensibility to other form types
- OCR providers pluggable (Mock/Tesseract/Textract)
- Rules engine is version-aware for reproducibility
- File processing uses async job queue pattern
- Reports stored as JSONB for flexible querying
- Consider adding WebSocket for real-time updates

Remember: Always verify authentication, handle errors gracefully, and write tests for new features.