# Supabase Integration Task Onboarding

## Task Overview
Integrate Supabase into the existing monorepo for Auth/DB/Storage functionality, using local Supabase CLI for development. Follow TDD approach by writing failing tests first.

## Current State Analysis

### Existing Structure
- **Monorepo**: pnpm workspace with Turborepo
- **Apps**: 
  - `apps/web` - Next.js 14 app with App Router
- **Packages**:
  - `packages/shared` - Shared utilities with Vitest testing
- **Environment**: 
  - `.env.local` file exists (user confirmed with Supabase credentials)
  - `env.example` has basic Supabase variables

### Key Files to Modify/Create
1. **Root Level**:
   - `supabase/config.toml` - Supabase CLI configuration
   - `supabase/migrations/0001_create_transactions_bucket.sql` - Storage bucket migration
   - `package.json` - Add Supabase scripts

2. **Packages/Shared**:
   - `src/supabaseEnv.ts` - Environment validation utility
   - `src/supabaseEnv.spec.ts` - Test for env validation (TDD - write first)

3. **Apps/Web**:
   - `src/lib/supabaseAdmin.ts` - Server-side Supabase admin client

## Implementation Plan (TDD Approach)

### Phase 1: Setup Test Infrastructure
1. Write failing test for `supabaseEnv` function
2. Test should check that function throws when env vars are missing
3. Add dotenv-cli for loading env vars in tests

### Phase 2: Supabase Configuration
1. Create Supabase CLI config with default ports
2. Add storage bucket migration for private `transactions` bucket
3. Update root package.json with Supabase scripts

### Phase 3: Implementation
1. Implement `supabaseEnv` utility to validate environment variables
2. Create server-side Supabase admin client
3. Update env.example with local Supabase defaults

### Phase 4: Verification
1. Ensure tests pass with proper env vars
2. Document setup instructions

## Technical Requirements

### Supabase CLI Configuration
- Use default ports (54321 for API, etc.)
- Configure for local development

### Storage Bucket
- Name: `transactions`
- Access: Private (no public reads)
- Create via SQL migration

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
```

### Security Considerations
- Service role key only on server-side
- Never bundle service role key in client code
- Use `process.env` for server-side access

## Dependencies to Add
- `@supabase/supabase-js` - Supabase client library
- `dotenv-cli` - For loading env vars in test scripts

## Success Criteria
1. Tests fail initially without env vars
2. Tests pass after adding .env.local
3. Supabase local instance runs with `pnpm supabase:start`
4. Storage bucket `transactions` is created as private
5. Admin client can be used for server operations

## Commands After Implementation
```bash
# Start local Supabase
pnpm supabase:start

# Run tests (should pass with .env.local)
pnpm test

# Stop Supabase
pnpm supabase:stop
```

## Next Steps
1. Start with failing test (TDD)
2. Implement Supabase configuration
3. Create utility functions
4. Verify everything works end-to-end