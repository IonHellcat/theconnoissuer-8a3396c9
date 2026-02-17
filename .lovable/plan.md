

## Next Steps: Search Results Page and Lounge Detail Page

Based on the plan and current progress, here are the two highest-impact features to build next. They complete the core browsing flow: **Search -> Results -> Lounge Detail**.

---

### 1. Search Results Page (`/search?q=...`)

Right now, the search bar on the home page likely navigates to `/search?q=dubai` but that page doesn't exist yet (you're seeing a 404).

**What gets built:**
- A new `/search` route that reads the `q` query parameter
- Queries both the `cities` and `lounges` tables using text search (matching name, country, description)
- Displays matching cities as cards and matching lounges as list items
- Links to `/city/:slug` for cities and `/lounge/:slug` for lounges
- Shows a "no results" state when nothing matches
- Inherits the same dark luxury styling

---

### 2. Individual Lounge Detail Page (`/lounge/:slug`)

When a user clicks a lounge card on the city page, they should land on a rich detail page.

**What gets built:**
- A new `/lounge/:slug` route
- Hero image with venue name, rating, and price tier overlay
- Full description, address, phone, website, hours
- Features displayed as elegant tags
- "Cigar Selection Highlights" section
- Photo gallery grid (using the `gallery` column)
- Placeholder reviews section (functional reviews come later with auth)
- "Get Directions" link using lat/lng coordinates

---

### Technical Details

**New files:**
- `src/pages/SearchPage.tsx` -- search results page
- `src/pages/LoungePage.tsx` -- individual lounge detail page

**Modified files:**
- `src/App.tsx` -- add `/search` and `/lounge/:slug` routes
- `src/components/HeroSection.tsx` -- ensure the search bar navigates to `/search?q=...` (verify current behavior)

**Database:** No changes needed. Existing `cities` and `lounges` tables have all required data.

**Search approach:** Use Supabase `.ilike()` or `.or()` filters to match the query against city names, country names, and lounge names/descriptions. This keeps it simple without needing full-text search indexes for now.

