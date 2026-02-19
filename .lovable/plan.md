

# Accuracy and Deduplication Layer

## Current State
- Database has 0 lounges and 0 pending lounges (fresh start)
- The `search-places` edge function already deduplicates by `google_place_id` against both `lounges` and `pending_lounges` before inserting
- However, there are gaps that will cause problems as data grows

## Gaps to Fix

1. **No database-level uniqueness** -- if two requests run simultaneously or a place comes from Firecrawl (no Place ID) and Google Places, duplicates can slip through
2. **No relevance filtering** -- Google Places returns hookah bars, vape shops, and general tobacco stores that aren't cigar lounges
3. **No fuzzy name matching** -- same business with slightly different names (e.g., "The Cigar Bar" vs "Cigar Bar") won't be caught
4. **No reporting** -- admin doesn't see how many were skipped or why

## What Gets Built

### 1. Database: Unique Indexes (safety net)
Add partial unique indexes so duplicates are impossible even if application logic fails:
- `lounges.google_place_id` (where not null) -- unique
- `pending_lounges.google_place_id` (where not null) -- unique

These are partial indexes so rows without a Place ID (e.g., manually added lounges) are unaffected.

### 2. AI Relevance Filter in `search-places`
After collecting Google Places results, batch all business names into a single AI call (Gemini Flash Lite via Lovable AI) that answers: "Is each business a cigar lounge, cigar bar, or cigar shop?"
- Non-cigar businesses (hookah bars, vape shops, general tobacco) get filtered out
- A confidence flag is stored in the `raw_data` column for admin reference
- Only one AI call per city (all names batched together), so it's fast and cheap

### 3. Fuzzy Name Dedup in `search-places`
Before inserting, check for existing lounges with similar names in the same city:
- Normalize names: lowercase, strip "the", remove punctuation
- Query existing lounges in the same city and compare normalized names
- Skip matches and log them as "probable duplicate"

### 4. Enhanced Response Stats
Update the `search-places` response to return:
- `count` -- new lounges inserted
- `total_found` -- raw count from Google Places
- `skipped_duplicates` -- skipped due to dedup
- `skipped_irrelevant` -- filtered by AI relevance check

### 5. Admin UI: Better Feedback
- Show detailed stats in the Import Form results: "8 new, 4 duplicates skipped, 3 non-cigar filtered"
- Add a "Possible Duplicate" warning badge on pending lounge cards when a similar name exists in the approved lounges table

## Technical Details

### Database Migration
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_lounges_google_place_id 
  ON public.lounges (google_place_id) 
  WHERE google_place_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_lounges_google_place_id 
  ON public.pending_lounges (google_place_id) 
  WHERE google_place_id IS NOT NULL;
```

### AI Relevance Filter (added to `search-places`)
- Uses Lovable AI gateway (no extra API key needed) with Gemini Flash Lite
- Single batch prompt: "Given these business names and addresses, mark each YES/NO for whether it is a cigar lounge, cigar bar, or cigar shop. Return JSON."
- Places marked NO are excluded from insertion
- Keeps the pipeline fast (one call per city, not per place)

### Fuzzy Name Matching Logic
```text
normalize("The Cigar Lounge & Bar") -> "cigar lounge bar"
normalize("Cigar Lounge and Bar")   -> "cigar lounge bar"
-> MATCH, skip as duplicate
```
- Applied after Google Place ID dedup
- Only compares within the same city to avoid false positives

### Updated Response Format
```json
{
  "success": true,
  "count": 8,
  "total_found": 15,
  "skipped_duplicates": 4,
  "skipped_irrelevant": 3
}
```

### Updated Import Form Results Display
Instead of: "8 new lounge(s)"
Shows: "8 new | 4 duplicates skipped | 3 non-cigar filtered | 15 total found"

### Pending Lounge Card: Duplicate Warning
- `AdminPendingPage` fetches all existing lounge names on load
- Each `PendingLoungeCard` checks if a normalized version of its name matches an existing lounge
- Shows a small orange "Possible Duplicate" badge if found

## Files Changed / Created

| File | Action |
|---|---|
| Database migration | New (unique indexes) |
| `supabase/functions/search-places/index.ts` | Modified (AI filter, fuzzy dedup, enhanced response) |
| `src/components/admin/ImportForm.tsx` | Modified (show detailed stats) |
| `src/components/admin/PendingLoungeCard.tsx` | Modified (duplicate warning badge) |
| `src/pages/AdminPendingPage.tsx` | Modified (fetch lounge names for comparison) |

