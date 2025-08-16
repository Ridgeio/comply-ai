# Auth Implementation Onboarding

## Task Overview
Implement authentication for the Comply AI Next.js app using Supabase, following TDD methodology. Unauthenticated users should only see auth pages, while authenticated users see the full app with navigation.

## Current State Analysis

### Existing Structure
- **Root Layout** (`apps/web/app/layout.tsx`): Currently renders Navigation for all users
- **Navigation** (`apps/web/components/navigation.tsx`): Contains nav items for Dashboard, Transactions, Rules, Reports, Settings
- **Homepage** (`apps/web/app/page.tsx`): Shows "Hello, Houston" with dashboard cards and system status
- **Transactions Section**: Already implemented with list and detail pages

### Existing Supabase Setup
- **Supabase JS** already installed: `@supabase/supabase-js": "^2.39.3"`
- **Testing libraries** already installed: `@testing-library/react`, `@testing-library/user-event`
- **Existing Supabase files**:
  - `src/lib/supabaseAdmin.ts`: Has `createAdminClient()` and `createBrowserClient()`
  - `src/lib/db.ts`: Database helper functions using Supabase
  - `packages/shared/src/supabaseEnv.ts`: Environment variable validation

### Required Package
- Need to install: `@supabase/auth-helpers-nextjs`

## Implementation Plan

### 1. Install Required Package
```bash
pnpm add -w @supabase/auth-helpers-nextjs
```

### 2. Create Tests First (TDD - RED Phase)
1. **Public vs Protected Layout Test** (`app/__tests__/public-vs-protected.spec.tsx`)
   - Test that public layout doesn't show nav items
   - Test that protected layout shows nav items with user context

2. **Redirects Test** (`app/__tests__/redirects.spec.ts`)  
   - Test `requireUser()` helper redirects when no user
   - Test `requireUser()` returns user when authenticated

3. **Sign-in Test** (`app/auth/__tests__/signin.spec.tsx`)
   - Test form submission calls `signInWithPassword`
   - Test successful login redirects to dashboard

### 3. Create Route Structure
```
apps/web/app/
  (public)/
    layout.tsx           # No nav, just brand
    auth/
      sign-in/page.tsx  # Sign in form
      sign-up/page.tsx  # Sign up form
  (protected)/
    layout.tsx          # Contains Navigation component
    dashboard/page.tsx  # New product dashboard
    transactions/       # Move existing
    rules/page.tsx      # New placeholder
    reports/page.tsx    # New placeholder  
    settings/page.tsx   # New placeholder
  page.tsx             # Root redirector
  middleware.ts        # Route protection
```

### 4. Implement Supabase Helpers
- `src/lib/supabaseServer.ts`: Server-side client using cookies
- `src/lib/supabaseClient.ts`: Client-side client wrapper
- `src/lib/auth.ts`: `requireUser()` helper

### 5. Move Existing Pages
- Move `transactions/` to `(protected)/transactions/`
- Create placeholder pages for Rules, Reports, Settings

### 6. Update Navigation Component
- Add user info display
- Add sign out button
- Only render in protected layout

### 7. Create Dashboard Page
- Replace current homepage content
- Add cards for Create Transaction, Upload Files, Recent Reports
- Remove monorepo/build info

### 8. Add Middleware
- Protect routes starting with `/dashboard`, `/transactions`, `/rules`, `/reports`, `/settings`
- Redirect to sign-in with return URL

### 9. Optional: Onboarding
- Create org on first sign-up
- Add user as broker_admin

## Key Considerations
1. Keep existing Supabase setup where possible
2. Navigation should only appear in protected layout
3. All tests must be written first (TDD)
4. Use shadcn components for UI consistency
5. Middleware provides belt-and-suspenders protection

## Files to Create/Modify

### New Files
- `app/(public)/layout.tsx`
- `app/(public)/auth/sign-in/page.tsx`
- `app/(public)/auth/sign-up/page.tsx`
- `app/(protected)/layout.tsx`
- `app/(protected)/dashboard/page.tsx`
- `app/(protected)/rules/page.tsx`
- `app/(protected)/reports/page.tsx`
- `app/(protected)/settings/page.tsx`
- `src/lib/supabaseServer.ts`
- `src/lib/supabaseClient.ts`
- `src/lib/auth.ts`
- `middleware.ts`
- Test files (3)

### Files to Move
- `app/transactions/` → `app/(protected)/transactions/`

### Files to Modify
- `app/page.tsx` - Convert to redirector
- `app/layout.tsx` - Remove Navigation
- `components/navigation.tsx` - Add user info and sign out

## Testing Strategy
1. Mock Supabase auth methods
2. Mock Next.js navigation (redirect, useRouter)
3. Test user flows: sign in, sign up, protected routes, sign out
4. Verify navigation visibility based on auth state