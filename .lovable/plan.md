

# Bulk Actions and Batch Import for Admin Lounges

## Problem
Right now you have to approve/reject each lounge individually, and scrape one city at a time. With dozens or hundreds of results, this is painfully slow.

## What Changes

### 1. Bulk Actions on Pending Lounges
- Add a "Select All" checkbox at the top of each city group
- Add individual checkboxes on each lounge card
- Show a floating action bar when items are selected with:
  - "Approve Selected (N)" button
  - "Reject Selected (N)" button
- All selected items process in parallel

### 2. "Approve All" / "Reject All" Per City Group
- Each city group header gets quick "Approve All" and "Reject All" buttons
- One click handles every pending lounge in that city

### 3. Batch City Scraping
- Replace the single city/country input with a multi-city input
- Let you paste or type multiple cities at once (e.g. "Miami, FL | New York, NY | London, UK")
- The edge function processes them sequentially and returns combined results
- A progress indicator shows which city is currently being scraped

### 4. Auto-Approve Option
- Add a toggle on the import form: "Auto-approve results"
- When enabled, scraped lounges skip the pending queue and go directly into the lounges table
- Useful when you trust the search results for well-known cities

---

## Technical Details

### Modified Files

**`src/pages/AdminPendingPage.tsx`**
- Add selection state (`selectedIds: Set<string>`)
- Add bulk approve/reject mutations that process all selected items
- Add "Select All" per group and global select
- Floating action bar at bottom of screen when selection is active

**`src/components/admin/PendingLoungeCard.tsx`**
- Add checkbox prop and selection state
- Visual highlight when selected

**`src/components/admin/ImportForm.tsx`**
- Replace single city/country inputs with a textarea for multiple entries (one per line, format: "City, Country")
- Add "Auto-approve" toggle switch
- Show per-city progress during batch scrape
- Call the edge function once per city entry

**`supabase/functions/scrape-lounges/index.ts`**
- Add optional `auto_approve: boolean` parameter
- When auto-approve is true: create the city if needed, insert directly into `lounges` table, increment `lounge_count`
- Keep existing pending flow as default

### Bulk Approve Flow (Client-Side)
```text
For each selected lounge (in parallel, batches of 5):
  1. Find or create city
  2. Insert into lounges table
  3. Update lounge_count on city
  4. Mark pending_lounges status = "approved"
Invalidate queries on completion
Show toast: "Approved N lounges"
```

### Batch Scrape Flow
```text
User enters:
  Miami, US
  New York, US
  London, UK

For each line (sequential to avoid rate limits):
  1. Call scrape-lounges edge function with { city, country, auto_approve }
  2. Update progress: "Scraping 2/3: New York..."
  3. Accumulate results count

Show final summary: "Found 47 new lounges across 3 cities"
```

