# Transaction Creation Fix Verification

## Issue
The transaction creation was failing with:
```
null value in column "created_by" of relation "transactions" violates not-null constraint
```

## Root Cause
The database schema (from `0002_core_schema.sql`) requires a `created_by` field, but the `createTransaction` function wasn't providing it.

## Fix Applied
Updated `/src/app/transactions/actions.ts` to:
1. Get the authenticated user via `supabaseServer()`
2. Include `created_by: user.id` in the transaction insert

## Changes Made
```typescript
// Before: Missing created_by field
.insert({
  org_id: orgId,
  title,
  status: 'draft'
})

// After: Includes created_by field
.insert({
  org_id: orgId,
  title,
  status: 'draft',
  created_by: user.id
})
```

## To Verify
1. Restart the dev server: `pnpm dev --filter @app/web`
2. Navigate to http://localhost:3000/transactions
3. Click "New Transaction"
4. Enter a title and submit
5. The transaction should be created successfully

## Additional Changes
- Moved `/app/(protected)/onboarding` to `/app/onboarding` to fix redirect loop
- Added `/onboarding` to protected routes in middleware.ts
- Cleared Next.js cache to ensure changes are picked up