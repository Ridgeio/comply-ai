# Organization Onboarding & Switcher Implementation

## Task Overview
Implement organization onboarding flow and org switcher for authenticated users who have no organization memberships. Follow TDD methodology.

## Current State Analysis

### Database Schema
- **orgs** table: id, name, created_at, updated_at
- **org_members** table: org_id, user_id, role (admin/member/viewer)
- RLS policies enabled for security

### Existing Code
- `src/lib/org.ts`: Has basic `getCurrentOrgId()` that throws error if no org
- Auth system already implemented with protected routes
- Transactions page shows "need to be part of an organization" message

### Problems to Solve
1. Users with no organizations get errors/stuck
2. No way to create first organization
3. No way to switch between multiple organizations
4. No persistent active org selection

## Implementation Plan

### 1. Tests First (TDD - RED Phase)
Create three test files:
- `app/(protected)/__tests__/org-guard.spec.ts` - Test requireCurrentOrg guard
- `app/(protected)/__tests__/org-switcher.spec.tsx` - Test org switcher component
- `app/(protected)/onboarding/__tests__/onboarding.spec.tsx` - Test onboarding flow

### 2. Core Components

#### Guard & Helpers (`src/lib/org.ts`)
- `getMembershipsForUser()` - Fetch all user memberships
- `requireCurrentOrg()` - Return current org or redirect to onboarding
- `setActiveOrgCookie()` - Persist org selection in cookie

#### Onboarding Flow
- `/onboarding` page for users with no orgs
- Form to create first organization
- Auto-assign user as 'admin' role
- Set cookie and redirect to app

#### Org Switcher
- Dropdown in protected header
- Shows all user's organizations
- Persists selection via cookie
- Triggers page refresh on change

### 3. Integration Points
- Update protected layout to use `requireCurrentOrg()`
- Pass org context to pages that need it
- Update transactions page to use new guard
- Optional: Auto-onboard on sign-up

## Key Design Decisions

### Cookie-based Org Selection
- Use `activeOrgId` cookie for persistence
- httpOnly: false for client access if needed
- sameSite: lax for CSRF protection

### Membership Roles
- Database has: admin, member, viewer
- Requirements mention: broker_admin
- Will use 'admin' for consistency with existing schema

### Redirect Flow
1. User signs in → Protected layout
2. `requireCurrentOrg()` checks memberships
3. If none → redirect to `/onboarding`
4. After creating org → redirect to `/transactions`
5. Cookie persists selection across sessions

## Testing Strategy
1. Mock `supabaseServer()` for unit tests
2. Mock server actions for component tests
3. Test redirect behavior
4. Test cookie persistence
5. Test org switching

## Files to Create/Modify

### New Files
- Tests (3 files)
- `app/(protected)/onboarding/page.tsx`
- `app/(protected)/onboarding/CreateOrgForm.tsx`
- `app/(protected)/OrgSwitcher.tsx`
- `src/app/onboarding/actions.ts`
- `src/app/org/actions.ts`

### Modified Files
- `src/lib/org.ts` - Complete rewrite with new functions
- `app/(protected)/layout.tsx` - Add org context
- `app/(protected)/transactions/page.tsx` - Use new guard
- Various action files - Use `requireCurrentOrg()`

## Acceptance Criteria
✅ Users with no memberships redirected to onboarding
✅ Can create organization through onboarding form
✅ Org switcher allows changing active organization
✅ Selection persists via cookie
✅ All tests passing
✅ No more "need organization" errors