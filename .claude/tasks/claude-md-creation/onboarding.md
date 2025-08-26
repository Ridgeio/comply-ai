# Task Onboarding: Claude.md Creation

## Task Context
Created comprehensive documentation for the Comply AI project to ensure consistent development practices and quick onboarding for future sessions.

## Project Understanding

### What is Comply AI?
A compliance platform for Texas real estate transactions that:
- Processes TREC (Texas Real Estate Commission) contract PDFs
- Extracts structured data using PDF parsing with OCR fallback
- Runs compliance checks against business rules
- Generates detailed reports highlighting issues and risks
- Manages multiple organizations with user access control

### Technical Architecture
```
comply-ai/
├── apps/web/                 # Next.js 14 application
│   ├── app/                  # App Router pages
│   │   ├── (protected)/      # Auth-required routes
│   │   └── (public)/         # Public routes
│   ├── components/           # Shared UI components
│   └── src/                  # Server actions & utilities
├── packages/
│   ├── parsers/              # PDF processing & OCR
│   └── shared/               # Business logic & rules
└── supabase/                 # Database migrations
```

### Key Technologies Identified
- **Frontend**: Next.js 14 with App Router, React Server Components
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **UI**: Tailwind CSS + shadcn/ui (Radix UI based)
- **Testing**: Vitest + React Testing Library
- **Build**: Turborepo + pnpm workspaces
- **Language**: TypeScript (strict mode)

## Domain Knowledge Acquired

### TREC Forms
- Standard contracts for Texas real estate transactions
- TREC-20 is the primary residential contract form
- Forms have version numbers (e.g., 20-18)
- Contains structured fields (buyer, seller, property, dates, prices)
- Special provisions are free-text requiring AI analysis

### Compliance Workflow
1. Users upload contract PDFs to transactions
2. System extracts data (with OCR if needed)
3. Rules engine checks for:
   - Missing required fields
   - Date inconsistencies
   - Price calculation errors
   - Form version mismatches
   - Risky special provisions
4. Report generated with severity-tagged issues

### Data Model
- **Organizations**: Multi-tenant isolation
- **Transactions**: Container for real estate deals
- **Files**: Uploaded PDFs with metadata
- **Reports**: Compliance analysis results
- **Ingest Jobs**: Async processing queue
- **Forms Registry**: Expected form versions

## Code Patterns Discovered

### Server Actions Pattern
```typescript
'use server';
// Always start with authentication
const orgId = await getUserOrgId(supabase);
// Return consistent shape
return { success: boolean, error?: string, data?: any };
```

### Database Access Pattern
```typescript
// Client for user context
const supabase = await createClient();
// Admin for bypassing RLS when needed
const adminSupabase = await createAdminClient();
```

### Testing Patterns
- `*.spec.ts` for logic tests
- `*.spec.tsx` for component tests
- `*.behavior.spec.tsx` for interaction tests
- Mocking Supabase clients for unit tests

## Security Considerations
- Row Level Security (RLS) on all tables
- Organization-based access control
- Service role key only used server-side
- File uploads go through validation
- All server actions verify user permissions

## Development Workflow

### Essential Commands
```bash
pnpm dev          # Start dev server
pnpm lint         # Check code style
pnpm typecheck    # Verify types
pnpm test:run     # Run tests once
pnpm build        # Production build
```

### Common Development Tasks
1. **Adding features**: Create server action → Add UI component → Write tests
2. **Debugging**: Check Supabase logs → Verify RLS → Test locally
3. **Testing**: Write test → Run with `pnpm test` → Verify in browser

## Key Files Explored
- `/package.json` - Monorepo configuration
- `/apps/web/package.json` - Web app dependencies
- `/README.md` - Project overview
- `/SETUP.md` - Detailed setup instructions
- `/supabase/migrations/` - Database schema evolution
- `/apps/web/src/app/transactions/[txId]/actions/` - Core business logic
- `/packages/parsers/src/` - PDF processing logic
- `/packages/shared/src/rules/` - Compliance rules

## Challenges & Solutions

### Challenge 1: Understanding Multi-tenant Architecture
- Solution: Traced RLS policies and org_members table relationships

### Challenge 2: Complex PDF Processing Pipeline
- Solution: Followed ingest_jobs flow from upload to report generation

### Challenge 3: Monorepo Structure
- Solution: Understood workspace dependencies and Turborepo pipelines

## Important Notes for Future Sessions

1. **Always run lint and typecheck** after code changes
2. **Check user organization access** in all server actions
3. **Use existing UI components** from shadcn/ui
4. **Follow established patterns** for consistency
5. **Write tests** for new features
6. **Never expose service keys** to client code

## Task Outcome
Successfully created two documentation files:
1. **Claude.md**: Comprehensive development guide with best practices, code patterns, and domain knowledge
2. **This onboarding.md**: Detailed record of exploration and understanding

The documentation will enable efficient development in future sessions by providing:
- Quick reference for commands and patterns
- Clear understanding of architecture
- Security and testing guidelines
- Domain-specific knowledge about TREC forms

## Time Investment
Thoroughly explored the codebase including:
- Project structure and dependencies
- Database schema and migrations
- Code patterns and conventions
- Testing setup and practices
- Security implementations
- Domain-specific logic

This comprehensive onboarding ensures future sessions can start productively without re-discovering the project structure and conventions.