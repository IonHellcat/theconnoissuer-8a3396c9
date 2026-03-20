

## Problem

Storing all 1,600+ lounge images in storage is expensive and unnecessary. The real issue is that Google Places API URLs don't work client-side due to API key referrer restrictions — but they work fine server-side.

## Better Approach: Server-Side Image Proxy

Instead of downloading and storing every image, create a lightweight edge function that acts as a proxy. The client requests `/functions/v1/image-proxy?url=...` and the function fetches the image from Google server-side and streams it back with proper cache headers.

**Zero storage cost. Same result.**

### Changes

1. **Create `image-proxy` edge function**
   - Accepts a `url` query parameter (the Google Places photo URL)
   - Fetches the image server-side (where the API key works)
   - Streams the response back with `Cache-Control: public, max-age=86400` (24h browser cache)
   - Validates the URL starts with `https://places.googleapis.com/` to prevent open proxy abuse

2. **Update `OptimizedImage` component**
   - When `src` contains `places.googleapis.com`, rewrite it to go through the proxy: `${SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(src)}`
   - All other URLs (already-stored Supabase URLs, placeholders) pass through unchanged

3. **Remove the storage migration approach**
   - Remove `FetchLoungeImagesButton` from admin toolbar
   - Delete the `fetch-lounge-images` edge function (no longer needed)
   - Optionally drop the `lounge-images` storage bucket if empty

### Technical Details

**Edge function** (`image-proxy/index.ts`):
- No auth required (images are public), but URL validation prevents abuse
- Strips the API key from the client-visible URL — the proxy adds `GOOGLE_PLACES_API_KEY` server-side
- Returns proper `Content-Type` from the upstream response
- `Cache-Control` header means each unique image is only fetched once per user per day

**OptimizedImage rewrite logic**:
```
if src contains "places.googleapis.com"
  → use proxy URL
else
  → use src as-is
```

**Security**: Only allows proxying URLs matching `https://places.googleapis.com/` — not an open proxy.

### What about the ~35 images already in storage?
Those keep working as-is (they're already Supabase URLs). This only affects the 1,631 lounges still using Google API URLs.

