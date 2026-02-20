

# Fetch Missing City Images

## Problem
45 cities are missing images, and while a `fetch-city-images` backend function exists (using Google Places API), there's no way to trigger it from the admin UI. The function also only processes 3 cities per call.

## Plan

### 1. Update the backend function
Modify `supabase/functions/fetch-city-images/index.ts` to:
- Accept an optional `mode` parameter: `"missing"` (default, only cities without images) or `"all"` (re-fetch all cities, replacing existing images)
- Accept an optional `limit` parameter (default 5, max 10) to control batch size
- Accept an optional `city_ids` array to target specific cities
- Increase default batch from 3 to 5 for faster processing

### 2. Add a "Fetch City Images" button to the Admin page
In `src/pages/AdminPendingPage.tsx`, add a button next to the existing export buttons that:
- Calls the `fetch-city-images` function repeatedly until all cities are processed
- Shows a progress indicator (e.g., "Fetched 15/45 cities...")
- Allows choosing between "Missing only" and "All cities" modes
- Displays results as they come in (which cities succeeded/failed)

### 3. Add config.toml entry
Add `verify_jwt = false` for `fetch-city-images` (it already exists for `generate-city-images` but not `fetch-city-images`).

---

## Technical Details

**Backend function changes** (`supabase/functions/fetch-city-images/index.ts`):
- Parse request body for `{ mode, limit, city_ids }`
- When `mode === "all"`, remove the `.is("image_url", null)` filter
- When `city_ids` is provided, filter by those specific IDs
- Return `{ processed, results, remaining }` so the frontend knows whether to call again

**Frontend changes** (`src/pages/AdminPendingPage.tsx`):
- Add a "Fetch City Images" button with a dropdown for mode selection
- Implement a loop that calls the function, updates progress state, and repeats until `remaining === 0`
- Show a toast summary when complete

**Config** (`supabase/config.toml`):
- Add `[functions.fetch-city-images]` with `verify_jwt = false`

