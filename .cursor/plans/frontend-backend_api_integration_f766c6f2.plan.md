---
name: Frontend-Backend API Integration
overview: Replace all mock data usage in the frontend with real API calls to the backend. This will make the app fully functional and validate the entire backend API works end-to-end.
todos:
  - id: homepage-api
    content: Update HomePage to fetch latest entry and stats from API instead of mock data
    status: completed
  - id: timeline-api
    content: Update TimelinePage to fetch entries list from API instead of mock data
    status: completed
  - id: entry-detail-api
    content: Update EntryDetailPage to fetch single entry from API instead of mock data
    status: completed
  - id: auth-aware-fetching
    content: Add authentication checks to prevent API calls when not logged in
    status: completed
  - id: loading-error-states
    content: Add consistent loading and error states across all pages
    status: completed
  - id: e2e-testing
    content: "Test complete flow: empty DB → create entry → view on all pages → verify stats"
    status: completed
isProject: false
---

# Frontend-Backend API Integration Plan

## Current State Analysis

### What's Complete ✅

- **Admin Authentication**: Backend and frontend login/logout working
- **Backend API**: All CRUD endpoints implemented and protected with admin auth
  - `GET /api/entries` - List entries (paginated)
  - `GET /api/entries/:id` - Get single entry
  - `POST /api/entries` - Create entry
  - `PUT /api/entries/:id` - Update entry
  - `DELETE /api/entries/:id` - Delete entry
  - `GET /api/stats` - Get statistics
- **Frontend Infrastructure**: API client (`lib/api.ts`) and React Query hooks (`hooks/use-entries.ts`) are ready

### What's Missing ❌

- **Frontend still uses mock data**:
  - `HomePage.tsx` uses `mockJournalEntries` and `trailStats`
  - `TimelinePage.tsx` uses `mockJournalEntries`
  - `EntryDetailPage.tsx` uses `mockJournalEntries`
  - `Stats` component receives hardcoded stats

### The Gap

The frontend has all the infrastructure but isn't calling the real API. All pages read from static mock data files instead of fetching from the backend.

## Implementation Plan

### Task 1: Update HomePage to Use Real API Data

**Files to modify:**

- `webapp/src/pages/HomePage.tsx`

**Steps:**

1. Remove imports of `mockJournalEntries` and `trailStats`
2. Import `useEntries` and `useStats` hooks from `@/hooks/use-entries`
3. Call `useEntries(1, 1)` to get the latest entry (first page, 1 item)
4. Call `useStats()` to get real statistics
5. Handle loading states with skeleton loaders or spinners
6. Handle error states with user-friendly error messages
7. Use the first entry from the API response as `latestEntry`
8. Pass real stats data to the `Stats` component
9. Pass real entries array to `TrailMap` component

**Verification:**

- HomePage loads without errors when not authenticated (should show error/empty state)
- After logging in, HomePage displays real data from the database
- Loading states appear while fetching data
- Error states display properly if API fails
- Latest entry section shows the most recent entry from the database
- Stats component shows real calculated statistics
- Map displays real entry locations

**Test commands:**

```bash
# Start backend and frontend
# Login at /admin
# Verify homepage shows real data (or empty state if no entries exist)
```

### Task 2: Update TimelinePage to Use Real API Data

**Files to modify:**

- `webapp/src/pages/TimelinePage.tsx`

**Steps:**

1. Remove import of `mockJournalEntries`
2. Import `useEntries` hook
3. Call `useEntries(1, 50)` to fetch entries (adjust pageSize as needed)
4. Extract `entries` and `pagination` from the response
5. Handle loading state - show skeleton or spinner
6. Handle error state - show error message
7. Handle empty state - show "No entries yet" message when `entries.length === 0`
8. Pass real `entries` array to `Timeline` component
9. Optionally add pagination controls if needed

**Verification:**

- TimelinePage loads without errors when not authenticated
- After logging in, TimelinePage displays real entries from database
- Loading spinner appears while fetching
- Empty state shows when no entries exist
- Error message displays if API call fails
- Entries are displayed in chronological order (newest first based on backend)

**Test commands:**

```bash
# Verify timeline shows real entries
# Test with empty database (should show empty state)
# Test with multiple entries (should show all)
```

### Task 3: Update EntryDetailPage to Use Real API Data

**Files to modify:**

- `webapp/src/pages/EntryDetailPage.tsx`

**Steps:**

1. Remove import of `mockJournalEntries`
2. Import `useEntry` hook from `@/hooks/use-entries`
3. Get `id` from `useParams()`
4. Call `useEntry(id)` to fetch the specific entry
5. Handle loading state - show skeleton or spinner
6. Handle error state - show error message with back button
7. Handle not found state - entry doesn't exist (404 from API)
8. Display the real entry data from API response
9. Pass real entry to `JournalEntry` and `TrailMap` components

**Verification:**

- EntryDetailPage loads without errors when not authenticated
- After logging in, EntryDetailPage displays real entry data
- Loading state appears while fetching
- 404 error shows "Entry Not Found" when entry doesn't exist
- Error message displays if API call fails
- Entry content, photos, and map display correctly

**Test commands:**

```bash
# Navigate to /entry/{valid-id} - should show real entry
# Navigate to /entry/invalid-id - should show 404
# Test with entries that have photos
```

### Task 4: Update Stats Component to Handle Real Data

**Files to modify:**

- `webapp/src/components/Stats.tsx` (if it has hardcoded fallbacks)

**Steps:**

1. Review `Stats.tsx` to ensure it properly handles the real data structure
2. Verify it matches the `Stats` type from `backend/src/types.ts`
3. Ensure it handles null/undefined values gracefully
4. Add loading/error states if needed (or handle at page level)

**Verification:**

- Stats component displays correctly with real API data
- Handles zero values gracefully (e.g., 0 miles, 0 days)
- Calculates percentages correctly (miles completed / total miles)
- Displays all stat fields: totalMiles, totalDays, averageMilesPerDay, totalElevationGain

### Task 5: Handle Authentication-Aware Data Fetching

**Files to modify:**

- All pages that fetch data (HomePage, TimelinePage, EntryDetailPage)

**Steps:**

1. Check `isAuthenticated` from `useAuth()` hook
2. Only fetch data when authenticated (use `enabled` option in `useQuery`)
3. Show appropriate message when not authenticated:
  - Option A: Show empty/placeholder state with "Login to view entries"
  - Option B: Redirect to login page
  - Option C: Show public view (if entries should be public)
4. Based on current architecture, entries require auth, so show login prompt

**Verification:**

- When not logged in, pages show appropriate message (not errors)
- After login, data loads automatically
- No unnecessary API calls when not authenticated
- Error handling for 401 Unauthorized responses

### Task 6: Add Error Boundaries and Loading States

**Files to modify:**

- Create `webapp/src/components/LoadingSpinner.tsx` (if doesn't exist)
- Create `webapp/src/components/ErrorMessage.tsx` (if doesn't exist)
- Or use shadcn/ui Skeleton and Alert components

**Steps:**

1. Create reusable loading component (or use shadcn Skeleton)
2. Create reusable error message component (or use shadcn Alert)
3. Apply consistent loading/error patterns across all pages
4. Ensure error messages are user-friendly

**Verification:**

- Consistent loading states across all pages
- User-friendly error messages
- Errors don't crash the app
- Loading states are visually appealing

### Task 7: Test End-to-End Flow

**Steps:**

1. Start with empty database
2. Verify all pages show appropriate empty states
3. Create a test entry via API (using cURL or Postman)
4. Verify HomePage shows the entry
5. Verify TimelinePage shows the entry
6. Click entry to view detail page
7. Verify EntryDetailPage shows full entry data
8. Verify Stats component calculates correctly
9. Test with multiple entries
10. Test pagination if implemented

**Verification checklist:**

- Empty database shows empty states (not errors)
- Single entry displays correctly on all pages
- Multiple entries display correctly
- Navigation between pages works
- Stats calculate correctly with real data
- Map displays entry locations correctly
- Photos display if entries have photos

## Technical Notes

### API Response Format

All endpoints return `{ data: T }` envelope. The `api.ts` client automatically unwraps this, so hooks receive the data directly.

### Authentication

All entry endpoints require admin authentication. The `useQuery` hooks should use `enabled: isAuthenticated` to prevent unnecessary calls.

### Type Safety

Types are already defined in:

- Backend: `backend/src/types.ts` (Zod schemas)
- Frontend: `webapp/src/lib/api.ts` (TypeScript interfaces)

Both should match. If there's a mismatch (e.g., `userId` in types but not in schema), note it but proceed - the current admin-only system may not need userId.

### React Query Configuration

The `useEntries`, `useEntry`, and `useStats` hooks are already set up with proper query keys and cache invalidation. Just use them in the components.

## Success Criteria

After completing this feature:

1. ✅ All pages fetch data from the backend API (no mock data)
2. ✅ Loading states work correctly
3. ✅ Error states work correctly
4. ✅ Empty states work correctly
5. ✅ Authentication is properly integrated
6. ✅ End-to-end flow works: login → view entries → view details
7. ✅ Stats calculate from real data
8. ✅ Map displays real entry locations

## Next Steps After This Feature

Once frontend-backend integration is complete, the logical next features would be:

1. **Admin UI for Creating/Editing Entries** - Build forms to create and edit journal entries through the UI
2. **Photo Upload** - Implement photo upload functionality
3. **Public/Private Views** - Make entries viewable without authentication (public journal)

But first, complete this integration to ensure the foundation works.