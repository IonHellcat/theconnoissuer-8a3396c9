

# Bootstrap Connoisseur Scores — Implementation Plan

This is a large feature spanning database changes, an edge function, a complex admin page, and user-facing display updates. Here is the full build plan with your adjustments incorporated.

---

## Phase 1: Database Schema

### New columns on `lounges` table:
- `connoisseur_score` (integer, nullable) -- 0-100 composite score
- `score_label` (text, nullable) -- tier label (Legendary/Exceptional/Outstanding/Excellent/Good or null)
- `score_source` (text, not null, default `'none'`) -- one of: `'estimated'`, `'verified'`, `'none'`
- `score_summary` (text, nullable) -- AI-generated one-sentence summary
- `pillar_scores` (jsonb, nullable) -- stores all pillar ratings, e.g. `{"cigar_selection": 4.5, "ambiance": 4.0, ...}`

### New table: `google_reviews`
- `id` (uuid, PK, default gen_random_uuid())
- `lounge_id` (uuid, FK to lounges.id, not null)
- `google_place_id` (text)
- `author_name` (text)
- `rating` (integer, 1-5)
- `review_text` (text)
- `relative_time` (text)
- `fetched_at` (timestamptz, default now())

RLS policies: publicly readable (Google reviews aren't private), admin-only insert/update/delete.

---

## Phase 2: Edge Function -- `bootstrap-scores`

A single edge function handling two operations via the request body `action` field:

### Action: `fetch-reviews`
- Calls `GET https://places.googleapis.com/v1/places/{place_id}?fields=reviews&key={GOOGLE_PLACES_API_KEY}`
- Parses response, stores reviews in `google_reviews` table (using service role client)
- Returns the review texts to the frontend
- If Google returns 0 text reviews: returns empty array, does NOT proceed to AI analysis

### Action: `analyze`
- Receives lounge info + review texts
- Sends to Lovable AI gateway (Gemini) with the pillar analysis prompt
- Prompt includes your instruction: "If a lounge has very few reviews or the reviews are too vague to assess a pillar reliably, return null for that pillar rather than guessing. Accuracy matters more than completeness."
- Uses different pillar sets based on lounge `type`:
  - **Lounges**: cigar_selection (25%), ambiance (30%), service (20%), drinks (15%), value (10%)
  - **Shops**: selection (25%), storage (30%), staff_knowledge (20%), pricing (15%), experience (10%)
- Calculates composite score: convert non-null pillars to 0-100, apply weighted average with proportional redistribution for null pillars
- Returns results (does NOT auto-save -- admin reviews first)

### Score Labels (tightened brackets):
- 93-100: "Legendary"
- 88-92: "Exceptional"
- 82-87: "Outstanding"
- 75-81: "Excellent"
- 65-74: "Good"
- Below 65: No label

### Edge case handling:
- 0 Google reviews (no text): set `score_source = 'none'`, skip AI analysis entirely
- API errors: skip lounge, continue batch, return error info to frontend
- All AI responses logged via `console.log` for debugging

---

## Phase 3: Admin Page -- `/admin/bootstrap-scores`

Following the same patterns as `GenerateFeaturesPage` and `GenerateDescriptionsPage`.

### Top Section: Progress Dashboard
- Stat cards: Total lounges, Estimated scores, Verified scores, No score
- Progress bar showing coverage percentage
- Cost estimate: (unscored lounges with google_place_id) x ~$0.03

### Main Section: Sortable Lounge List
- Columns: Name, City, Google Rating, Score Status
- Color-coded status badges: green = estimated, blue = verified, red = no score
- "Bootstrap Single" button per row
- "Bulk Bootstrap (Top 50)" button in header with 2-second delay between calls

### Single Bootstrap Flow:
1. Click "Bootstrap" on a lounge
2. Edge function fetches Google reviews (displayed to admin)
3. If reviews exist, runs AI analysis
4. Shows editable pillar scores (number inputs), calculated composite score, editable summary text
5. "Approve and Save" or "Skip" buttons

### Bulk Bootstrap Flow:
1. Click "Bulk Bootstrap"
2. Real-time progress: "Processing 23/50... Casa del Habano, Havana..."
3. 2-second delay between lounges to respect rate limits
4. Results appear in a reviewable table
5. "Approve All" and "Approve Selected" buttons
6. Saving updates `lounges` table with score fields

---

## Phase 4: User-Facing Display Changes

### Lounge Cards (CityPage `RankedLoungeCard`, SearchPage lounge results):
- **Estimated score**: Score number in a circular badge with dashed border, 60% opacity, "Est." label below in muted text
- **Verified score**: Score number in a solid circular badge with subtle glow/shadow, full opacity, tier label below in gold text
- **No score**: Show Google rating as "G 4.7" in muted style (existing behavior, no change needed)
- **Score summary**: Shown as a one-line italic subtitle below the lounge name in lighter text color

### Lounge Detail Page (`LoungePage`):
- **Estimated**: Show score badge + pillar breakdown, "Estimated Score -- Based on analysis of public reviews", CTA "Rate this lounge to help verify the Connoisseur Score", tooltip explainer
- **Verified**: Gold badge, "Verified Connoisseur Score -- Based on [X] member reviews"
- **None**: "Awaiting Connoisseur Score", show Google rating, CTA "Be the first to rate this lounge"
- **Score summary**: Displayed as a tagline directly below the score badge

---

## Phase 5: Auto-Transition Logic (Future)

When a lounge accumulates 3+ detailed user reviews, recalculate the score from user reviews only and update `score_source` to `'verified'`. This will be implemented as logic in the review submission flow rather than a database trigger, to keep it visible and maintainable. This phase is deferred -- it can be built after the core bootstrap system is working.

---

## Technical Details

- **Secrets**: `GOOGLE_PLACES_API_KEY` and `LOVABLE_API_KEY` are already configured -- no new secrets needed
- **AI Gateway**: All AI calls go through `https://ai.gateway.lovable.dev/v1/chat/completions` using `google/gemini-2.5-flash` (good balance of cost and quality for this task)
- **JSONB pillar_scores**: Avoids 10+ individual columns, handles different pillar sets for lounges vs shops gracefully
- **Admin auth**: Same pattern as existing admin pages (JWT + user_roles check)
- **Route**: Added to `App.tsx` as `/admin/bootstrap-scores` with lazy loading
- **Config**: `verify_jwt = false` in `supabase/config.toml` (auth validated in code)

### Files to create:
- `supabase/functions/bootstrap-scores/index.ts`
- `src/pages/BootstrapScoresPage.tsx`
- `src/components/ConnoisseurScoreBadge.tsx` (reusable badge component for cards and detail page)

### Files to modify:
- `src/App.tsx` (add route)
- `src/pages/CityPage.tsx` (add score badge to RankedLoungeCard, add summary subtitle)
- `src/pages/SearchPage.tsx` (add score badge to lounge results, add summary subtitle)
- `src/pages/LoungePage.tsx` (add score section with pillar breakdown)
- `supabase/config.toml` (add bootstrap-scores function config)

### Build order:
1. Database migration (new columns + new table)
2. Edge function
3. Admin page
4. ConnoisseurScoreBadge component
5. Update CityPage, SearchPage, LoungePage with score display

