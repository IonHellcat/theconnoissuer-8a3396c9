## Implemented: Server-Side Image Proxy

Google Places API URLs are now proxied through the `image-proxy` edge function instead of being stored in Supabase storage. The `OptimizedImage` component detects Google URLs and rewrites them to `/functions/v1/image-proxy?url=...`. The proxy validates URLs, adds the API key server-side, and returns images with 24h cache headers. Zero storage cost.

### Removed
- `fetch-lounge-images` edge function (storage migration approach)
- `FetchLoungeImagesButton` admin UI component
