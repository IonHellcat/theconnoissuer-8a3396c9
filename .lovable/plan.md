

# Firecrawl Scraping Pipeline

## Overview

Build the Firecrawl-based scraping edge function and admin UI so you can import cigar lounge data from directories, review it, and approve listings -- all without needing a Google API key.

## Step 1: Connect Firecrawl

Before any code runs, we need to link the Firecrawl connector to your project. You'll be prompted to set up the connection, which gives the backend access to a `FIRECRAWL_API_KEY` automatically.

## Step 2: Create the Scrape Edge Function

Create `supabase/functions/scrape-lounges/index.ts` that:

- Accepts `{ city: string, country: string }` as input
- Uses Firecrawl's **search** endpoint to find cigar lounges/shops in that city across the web
- Also uses Firecrawl's **scrape** endpoint with JSON extraction to pull structured data from known cigar directories (cigaraficionado.com, cigarplaces.com, etc.)
- Maps results to the `pending_lounges` schema (name, address, description, type, etc.)
- Generates slugs from business names
- Deduplicates by matching on name + city_name before inserting
- Inserts into `pending_lounges` with `source = 'firecrawl'` and `status = 'pending'`
- Uses the service role key to bypass RLS
- Returns a count of new results found

## Step 3: Build the Admin Pages

### Admin Pending Review Page (`/admin/pending`)

- Protected route: checks if the logged-in user has the "admin" role, redirects otherwise
- Lists all pending lounges, grouped by city
- Each card shows: name, address, type, source, rating, description
- Three action buttons per card:
  - **Approve**: creates the city (if needed), inserts into `lounges`, increments `lounge_count`, marks pending as "approved"
  - **Edit**: opens a dialog/form pre-filled with scraped data for corrections before approving
  - **Reject**: updates status to "rejected"
- Search/filter bar to filter by city or name
- Status filter tabs: Pending / Approved / Rejected

### Import Trigger Section

- At the top of the admin page, a form with:
  - City name input
  - Country input
  - "Scrape Directories" button (Google Places button shown but disabled with "Coming Soon" label)
- Shows loading state during scraping
- Displays result count when complete

## Step 4: Wire Up Routing

- Add `/admin/pending` route to `App.tsx`
- Create an `AdminLayout` or guard component that checks for admin role

## Technical Details

### Edge Function: scrape-lounges

```text
Input: { city: string, country: string }
Flow:
  1. Firecrawl Search: "cigar lounge {city} {country}"
  2. Firecrawl Search: "cigar shop {city} {country}"  
  3. Firecrawl Search: "tobacco shop {city} {country}"
  4. For each result with a URL, optionally scrape for more details
  5. Map to pending_lounges columns
  6. Deduplicate against existing pending + approved lounges
  7. Insert new entries with source = 'firecrawl'
  8. Return { count: N, results: [...] }
```

### Admin Role Check

Uses the existing `has_role` database function and `user_roles` table. The admin page will query `user_roles` to verify the current user has the admin role before rendering.

### New Files

- `supabase/functions/scrape-lounges/index.ts` -- edge function
- `src/pages/AdminPendingPage.tsx` -- admin review + import UI
- `src/hooks/useAdminRole.tsx` -- hook to check admin status
- `src/components/admin/PendingLoungeCard.tsx` -- card component for pending listings
- `src/components/admin/ImportForm.tsx` -- city search trigger form
- `src/components/admin/EditPendingDialog.tsx` -- edit dialog for pending lounges

### Modified Files

- `src/App.tsx` -- add admin route
- `supabase/config.toml` -- add `verify_jwt = false` for scrape-lounges function

