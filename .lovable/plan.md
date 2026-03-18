

## Plan: Auto-detect location on page load with silent fallback to city search

The "For You" page should **try geolocation automatically** when the page loads — no button click needed. If it succeeds, results appear instantly. If it fails (Safari blocks it, iframe restrictions, etc.), it silently falls back to the city search input without showing any error. The user never sees "location denied" — they just see the search field ready to use.

### Changes in `src/pages/ForYouPage.tsx`

1. **Auto-request geolocation on mount** — add a `useEffect` that calls `navigator.geolocation.getCurrentPosition` once on page load. On success, set lat/lng/label. On failure, silently set a `geoAttempted` flag (no error shown).

2. **Remove the "Use my location" button** — since geo is attempted automatically, the manual button is redundant. If geo succeeds, the user sees results. If it fails, they see the city search input immediately.

3. **Remove `geoError` state and its error message** — no red "location denied" text. Replace with `geoAttempted` boolean that just controls whether we've finished trying.

4. **Show a brief loading state while geo is being attempted** — a small spinner or "Finding your location..." text for the ~1-2 seconds while the browser decides. Once resolved (success or failure), show either results or the city search.

5. **Keep `Navigation` import removal** — no longer needed since the button is gone.

### Updated state:
```
- Remove: geoError
- Add: geoAttempted (boolean, starts false)
- Keep: geoLoading, userLat, userLng, locationLabel, cityQuery, etc.
```

### Updated flow:
```
Page loads → auto-try geolocation (show "Finding your location..." briefly)
  ├─ Success → set coords → results load via useQuery
  └─ Fail → set geoAttempted=true → show city search input (no error)
```

### Empty state text change:
From "Set your location to find lounges near you" to "Search for a city to find lounges near you" (shown only after geo attempt fails).

No other files change. No data fetching or edge function changes.

