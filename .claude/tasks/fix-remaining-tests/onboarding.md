# Fix Remaining 3 Test Failures - Onboarding Document

## Task Overview
Fix the last 3 failing tests in the Comply AI compliance document processing system while ensuring all fixes maintain test validity - they still test the actual product functionality.

## Current Test Status
- **Total Tests**: 122
- **Passing**: 119
- **Failing**: 3

## Failing Tests Analysis

### 1. Timestamp Test Failure
**Test**: `tests/report-regenerate.spec.tsx > Report Regenerate Flow > should update timestamp after successful regeneration`

**Issue**: 
- Test expects: "Jan 17, 2025 10:00 AM"
- Actually shows: "Jan 17, 2025 4:00 AM"
- Difference: 6 hours (timezone issue)

**Root Cause**:
- The mock data uses UTC timestamp: `'2025-01-17T10:00:00Z'`
- `date-fns` formats dates in local timezone
- Test runs in UTC-6 timezone (CST), causing 6-hour difference

**Location in Code**:
- Test: `/apps/web/tests/report-regenerate.spec.tsx:213`
- Component: `/apps/web/app/(protected)/transactions/[txId]/report/ReportSummary.tsx:97`
- Format code: `format(new Date(report.updated_at), 'MMM d, yyyy h:mm a')`

### 2. File Progress Polling Test Timeout
**Test**: `app/(protected)/transactions/[txId]/__tests__/files-tab.behavior.spec.tsx > Files Tab Behavior > should show file progress after drag and drop`

**Issue**: 
- Test times out after 10 seconds
- Complex interaction between fake timers and async operations

**Test Flow**:
1. Uses `vi.useFakeTimers()`
2. Simulates file upload via mock dropzone
3. Expects status progression: queued → processing → done
4. Uses `vi.advanceTimersByTime(3100)` to trigger polling
5. Times out waiting for status changes

**Components Involved**:
- FilesTab component with polling logic
- Mock UploadDropzone
- Mock listFilesWithJobStatus that returns different states based on `pollCount`

### 3. Polling Limit Test Timeout  
**Test**: `app/(protected)/transactions/[txId]/__tests__/files-tab.behavior.spec.tsx > Files Tab Behavior > should stop polling after max attempts`

**Issue**:
- Test times out after 15 seconds
- Tests that polling stops after 30 attempts (MAX_POLL_ATTEMPTS)

**Test Flow**:
1. Uses `vi.useFakeTimers()`
2. Mocks files to always return 'processing' status
3. Advances time in loop 30 times (3 seconds each)
4. Expects exactly 30 calls to listFilesWithJobStatus
5. Times out during the loop

**Key Constants**:
- POLL_INTERVAL = 3000ms (3 seconds)
- MAX_POLL_ATTEMPTS = 30 (90 seconds total)

## Component Architecture

### FilesTab Polling Logic
```typescript
// FilesTab.tsx
const POLL_INTERVAL = 3000; // 3 seconds
const MAX_POLL_ATTEMPTS = 30; // 90 seconds total

// Polling is triggered when:
- Files have status 'queued' or 'processing'
- pollCountRef.current < MAX_POLL_ATTEMPTS

// Polling uses:
- setTimeout for scheduling next poll
- useEffect to start/stop polling
- pollCountRef to track attempts
```

### Mock Setup Issues
The tests use complex mocking:
1. **Fake Timers**: `vi.useFakeTimers()` and `vi.advanceTimersByTime()`
2. **Async Operations**: File uploads and polling
3. **React Effects**: useEffect hooks that trigger polling
4. **Refs**: pollCountRef that persists across renders

## Potential Solutions

### Fix 1: Timestamp Test
**Options**:
1. Make test timezone-agnostic by checking only date part
2. Use flexible regex that accepts any time
3. Mock the Date constructor or timezone
4. Use UTC formatting in component

**Recommended**: Use flexible regex or check only date part to avoid timezone issues

### Fix 2 & 3: Polling Tests
**Options**:
1. Remove fake timers and use real timers with shorter intervals
2. Properly flush all pending timers and promises
3. Mock the polling mechanism directly
4. Simplify the test to not depend on exact timing

**Issues to Address**:
- Fake timers may not play well with React's useEffect and async operations
- Need to ensure all promises resolve before advancing timers
- May need to use `vi.runAllTimers()` or `vi.runOnlyPendingTimers()`

## Previous Context
From earlier fixes:
- Added Generate Report button to FilesTab
- Fixed ReportSummary to accept both `countsBySeverity` and `issues` props
- Added router mocks for Next.js navigation
- Fixed various component prop interfaces

## Testing Environment
- Vitest test runner
- React Testing Library
- JSDOM environment (has limitations with timers and navigation)
- Node.js with potential timezone differences

## Files to Modify
1. `/apps/web/tests/report-regenerate.spec.tsx` - Fix timestamp assertion
2. `/apps/web/app/(protected)/transactions/[txId]/__tests__/files-tab.behavior.spec.tsx` - Fix both polling tests
3. Potentially `/apps/web/app/(protected)/transactions/[txId]/FilesTab.tsx` - If component changes needed

## Success Criteria
- All 3 tests pass consistently
- No changes that break existing functionality
- Tests still validate real product behavior
- No "quick fixes" that bypass actual testing