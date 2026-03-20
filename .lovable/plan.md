

## Improve Plan Trip City Search

### Current Issues
1. **Dropdown limited to 30 results** — `filtered.slice(0, 30)` hides cities
2. **Dropdown uses `absolute` positioning** without being relative to parent — can misalign
3. **No empty state** — typing a non-matching query shows nothing
4. **No lounge count shown** — user has no idea how many venues a city has
5. **No keyboard navigation** — can't arrow through results
6. **Clearing selection is awkward** — typing after selecting deselects silently
7. **Dropdown height too small** (`max-h-56` = 224px) — hard to browse

### Changes

#### 1. Add lounge count per city (`ForYouPage.tsx`)
- Extend `CityOption` to include `loungeCount: number`
- Count lounges per city from the query results (the data is already there, just not aggregated)

#### 2. Rewrite city selector (`IntentScreen.tsx`)
- **Show all cities** when focused with empty query (remove the slice limit)
- **Group cities by country** with sticky country headers for easy scanning
- **Show lounge count** badge next to each city name (e.g. "Dubai · 12 lounges")
- **Add empty state** message: "No cities found"
- **Fix dropdown positioning** — add `relative` to the wrapper div
- **Increase dropdown height** to `max-h-80` (320px) for better browsing
- **Add clear button** (X icon) inside the input when text is present
- **Highlight matching text** in search results for better visual feedback
- **Add keyboard support** — arrow keys to navigate, Enter to select, Escape to close

#### 3. Visual polish
- Add a subtle search icon inside the input field
- Smooth scroll behavior on the dropdown
- Selected city gets a checkmark indicator

### Technical Details

**Grouping logic**: Sort filtered cities by country, then render with country headers. Use a flat list with conditional headers rather than nested maps for performance.

**Keyboard navigation**: Track `highlightedIndex` state, handle `onKeyDown` on the input for ArrowUp/ArrowDown/Enter/Escape. Scroll highlighted item into view with `scrollIntoView`.

**Lounge count**: In the existing query, count occurrences per `city_id` in the map aggregation — no additional database call needed.

Files to modify:
- `src/pages/ForYouPage.tsx` — extend `CityOption` with `loungeCount`
- `src/components/for-you/IntentScreen.tsx` — rewrite city selector with all improvements

