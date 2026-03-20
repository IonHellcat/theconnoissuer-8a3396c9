

## Problem

**1631 out of 1666 lounges** use direct Google Places API photo URLs with an embedded API key (e.g. `https://places.googleapis.com/v1/.../media?maxWidthPx=800&key=AIza...`). These URLs fail silently in the browser — the HTTP request returns a non-image error response, the browser fires `onLoad` (not `onError`), and the image appears blank/invisible.

Zero lounge images are stored in Supabase storage. City images were already migrated (via the existing `fetch-city-images` function), but lounges were not.

## Root Cause

The `search-places` edge function stores raw Google Places API URLs with the API key baked in. These break client-side because:
- Google Places API has HTTP referrer restrictions — the key works server-side but not from browser origins
- Photo references can expire
- The `OptimizedImage` component's `onError` handler doesn't catch this because the HTTP response succeeds (200 with error JSON/HTML), so `onLoad` fires instead

## Plan

### 1. Fix OptimizedImage to detect broken images (client-side immediate fix)
Add a `naturalWidth` check in `onLoad` — if the image loaded but has zero natural dimensions, treat it as errored and show the placeholder. This ensures broken Google URLs show a placeholder instead of nothing.

### 2. Create a `fetch-lounge-images` edge function (permanent fix)
Modeled after the existing `fetch-city-images` function — downloads Google Places photos server-side and uploads them to a new `lounge-images` storage bucket. Updates the `image_url` column with the Supabase storage public URL.

- Supports `mode: "missing"` (only lounges with Google API URLs) and `mode: "all"` 
- Processes in batches of 5 with pagination support for the admin UI
- Uses the existing `google_place_id` and `GOOGLE_PLACES_API_KEY` secret

### 3. Create `lounge-images` storage bucket
Public bucket for storing downloaded lounge photos, mirroring the `city-images` bucket pattern.

### 4. Add admin UI button to trigger the migration
Add a "Fetch Lounge Images" button to the admin tools bar, reusing the same dropdown pattern as `FetchCityImagesButton` (missing only / all lounges / re-fetch).

### 5. Update `search-places` to store images in Supabase storage at ingest time
Modify the `getPhotoUrl` helper to download the photo and upload to the `lounge-images` bucket during discovery, so new lounges get stable Supabase URLs from the start.

## Technical Details

**OptimizedImage fix** — `onLoad` handler:
```tsx
onLoad={(e) => {
  const img = e.currentTarget;
  if (img.naturalWidth === 0) {
    if (!errored) { setErrored(true); }
  }
  setLoaded(true);
}}
```

**Edge function** — `fetch-lounge-images/index.ts`: Same auth/admin check pattern as `fetch-city-images`. Query lounges where `image_url LIKE '%places.googleapis.com%'`, fetch photo via Google Places API server-side, upload to `lounge-images` bucket, update the `image_url` column.

**search-places change** — Replace `getPhotoUrl` with an async `downloadAndStorePhoto` that fetches the image bytes, uploads to `lounge-images/{lounge_slug}.jpg`, and returns the Supabase public URL.

