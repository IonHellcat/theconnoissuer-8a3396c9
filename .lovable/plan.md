

# Global Lounge & Shop Data Pipeline

## Overview

Build a two-pronged data ingestion system that uses **Google Places API** for verified business data (name, address, hours, phone, ratings, photos, coordinates) and **Firecrawl web scraping** for cigar-specific details from niche directories. An admin-facing tool lets you trigger searches by city and review/approve results before they go live.

---

## How It Works

1. **You enter a city name** (e.g., "Barcelona") in an admin tool
2. The system searches Google Places for cigar lounges/shops in that city
3. It also scrapes popular cigar directories (e.g., cigaraficionado.com, cigarplaces.com) for that city
4. Results are merged and saved as **pending listings** for your review
5. You approve, edit, or reject each listing -- approved ones go live

---

## Step 1: Database Changes

Add a `pending_lounges` table to hold scraped/fetched data before approval:

- Same columns as `lounges` plus:
  - `status` (text): "pending", "approved", "rejected"
  - `source` (text): "google_places", "firecrawl", "manual"
  - `google_place_id` (text, nullable): to avoid duplicates
  - `raw_data` (jsonb, nullable): store the original API response for reference
- Add a `google_place_id` column to the existing `lounges` table for deduplication
- RLS: only accessible to admin users (or service role)

---

## Step 2: Google Places Edge Function

Create `supabase/functions/fetch-places/index.ts`:

- Accepts a city name + country and search terms like "cigar lounge", "cigar shop", "tobacco shop"
- Calls the Google Places API (Text Search) to find matching businesses
- For each result, fetches Place Details (hours, phone, website, photos)
- Saves results to `pending_lounges` with `source = 'google_places'`
- Skips any place already in `lounges` (matched by `google_place_id`) or already pending
- Returns a count of new results found

**Requires**: A Google Places API key (you will need to provide this)

---

## Step 3: Firecrawl Scraping Edge Function

Create `supabase/functions/scrape-lounges/index.ts`:

- Accepts a city name and scrapes known cigar directories for listings in that city
- Uses Firecrawl (already available as a connector) to scrape pages
- Extracts lounge names, addresses, and descriptions
- Saves to `pending_lounges` with `source = 'firecrawl'`
- Attempts deduplication by matching on name + city

---

## Step 4: Admin Review Page

Create `/admin/pending` page:

- Lists all pending lounges grouped by city
- Each card shows the scraped data with an "Approve", "Edit", or "Reject" button
- **Approve**: moves the listing to the `lounges` table and auto-creates the city if needed, incrementing `lounge_count`
- **Edit**: opens a form pre-filled with the scraped data so you can correct details before approving
- **Reject**: marks as rejected (stays in pending for reference)
- Search/filter bar at the top to find specific pending entries

---

## Step 5: Admin Trigger UI

Add a simple "Import Data" section on the admin page:

- Text input for city name + country
- Two buttons: "Search Google Places" and "Scrape Directories"
- Shows progress/results after each run
- Can run both at once for a comprehensive search

---

## Technical Details

### Google Places API Integration

```text
Edge Function: fetch-places
  Input: { city: string, country: string }
  Flow:
    1. Text Search: "cigar lounge in {city}, {country}"
    2. Text Search: "cigar shop in {city}, {country}"
    3. Text Search: "tobacco store in {city}, {country}"
    4. For each unique result -> Place Details API
    5. Map to pending_lounges schema
    6. Insert with source = 'google_places'
```

### Data Mapping (Google Places to Lounges)

```text
Google Places Field     ->  Lounges Column
displayName             ->  name
formattedAddress        ->  address
location.lat/lng        ->  latitude / longitude
rating                  ->  rating
userRatingCount         ->  review_count
currentOpeningHours     ->  hours (as JSON)
nationalPhoneNumber     ->  phone
websiteUri              ->  website
photos[0]               ->  image_url
photos[1:]              ->  gallery
place_id                ->  google_place_id
```

The `type` field will default to "lounge" or "shop" based on the search term that found it. `price_tier` will be inferred from Google's `priceLevel` if available.

### Firecrawl Scraping

Uses the already-available Firecrawl connector to scrape known cigar directories. Results are less structured but can supplement Google data with cigar-specific info (featured cigars, atmosphere descriptions).

### Security

- The admin page will be protected -- only your account can access it
- Edge functions use the service role key to write to `pending_lounges`
- The `pending_lounges` table has RLS that blocks public access
- API keys are stored as secrets, never exposed to the client

### Required Secrets

- **GOOGLE_PLACES_API_KEY**: You will need to get this from the Google Cloud Console (Places API must be enabled)
- **Firecrawl**: Already available via connector

---

## What You Get

- A reliable pipeline to populate your database with real, verified business data for any city in the world
- Deduplication so you never get the same lounge twice
- Full editorial control -- nothing goes live without your approval
- The ability to enrich listings with cigar-specific details from niche sources
- A scalable process: adding a new city takes seconds, not hours of manual data entry

