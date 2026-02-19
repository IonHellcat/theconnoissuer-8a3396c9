

# Country-First Data Population with Google Places

## Overview

A two-step pipeline: first discover cigar-friendly cities in a country using Firecrawl + AI, then pull verified lounge data for each city using Google Places API. The admin works at the country level -- one click per country, not per city.

## How It Works

**Step 1 -- Enter Countries**
Type country names (or click a region preset like "North America") in the admin panel.

**Step 2 -- Discover Cities**
For each country, Firecrawl searches for "best cigar cities in [country]" and an AI model extracts a clean list of city names from the results.

**Step 3 -- Review and Scrape**
The discovered cities appear as a checklist. Uncheck any you don't want, then hit "Scrape All" which calls Google Places for each city to pull verified business data (address, phone, hours, rating, photos, coordinates).

**Step 4 -- Approve or Auto-Approve**
Results land in pending review (or go directly live if auto-approve is on).

## What Gets Built

### 1. New Edge Function: `discover-cities`
- Accepts `{ countries: string[] }`
- For each country, runs Firecrawl search: "best cities for cigars in [country]", "top cigar lounge cities [country]"
- Sends combined search results to Gemini Flash with a prompt to extract city names as JSON
- Returns `{ country, cities: string[] }[]`
- No database writes -- just returns suggestions

### 2. New Edge Function: `search-places`
- Accepts `{ city, country, auto_approve }`
- Calls Google Places Text Search API for "cigar lounge in {city}, {country}" and "cigar shop in {city}, {country}"
- Uses field masks to get: name, address, phone, rating, review count, hours, coordinates, photos, website, Place ID
- Deduplicates against existing lounges using `google_place_id` column
- If auto-approve: creates city + inserts directly into `lounges` table
- If not: inserts into `pending_lounges` table
- Returns structured results with count

### 3. New Component: `DiscoverCitiesForm`
- Textarea for country names (one per line)
- Region preset buttons: "North America", "Europe", "Caribbean", "Middle East", "All Major"
- "Discover" button that calls the edge function
- Results shown as checkable city lists grouped by country
- "Send to Scraper" button that passes selected cities to ImportForm

### 4. Updated: `ImportForm`
- Accepts optional `initialCities` prop to be pre-populated from discovery step
- Adds a source toggle: "Firecrawl" (existing) vs "Google Places" (new)
- When Google Places is selected, calls `search-places` instead of `scrape-lounges`
- Enables the currently-disabled Google Places button

### 5. Updated: `AdminPendingPage`
- Adds DiscoverCitiesForm above ImportForm
- Wires up city list transfer between the two components via shared state

## Prerequisite: Google Places API Key

A `GOOGLE_PLACES_API_KEY` secret is required. You will need:
1. A Google Cloud project with the "Places API (New)" enabled
2. An API key from that project
3. You'll be prompted to add this secret before implementation proceeds

## Data Mapping (Google Places to Database)

| Google Places Field | Database Column |
|---|---|
| displayName.text | name |
| formattedAddress | address |
| nationalPhoneNumber | phone |
| websiteUri | website |
| rating | rating |
| userRatingCount | review_count |
| regularOpeningHours | hours (JSONB) |
| location.latitude | latitude |
| location.longitude | longitude |
| id | google_place_id |
| photos[0] via Photo API | image_url |

## Admin Workflow Summary

```text
Admin enters: "United States" (or clicks "North America")
                |
                v
    discover-cities edge function
    (Firecrawl + Gemini Flash)
                |
                v
    Shows: Miami, New York, Las Vegas, Dallas, Tampa... (checkboxes)
    Admin unchecks irrelevant cities
                |
                v
    "Send to Scraper" populates Import Form
                |
                v
    Google Places scrape with auto-approve ON
    (processes each city sequentially)
                |
                v
    Verified lounges appear in the directory
```

## Files Changed / Created

| File | Action |
|---|---|
| `supabase/functions/discover-cities/index.ts` | New |
| `supabase/functions/search-places/index.ts` | New |
| `src/components/admin/DiscoverCitiesForm.tsx` | New |
| `src/components/admin/ImportForm.tsx` | Modified (initialCities prop, source toggle) |
| `src/pages/AdminPendingPage.tsx` | Modified (add DiscoverCitiesForm, wire state) |

