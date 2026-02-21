

# Add Score Explainer Section to City Page

## What This Does
Adds a compact, elegant explainer panel between the city hero and the lounge listings that educates visitors on how the ranking system works. It will clearly communicate:

- Rankings on this page are based on **Google Reviews** (rating + review volume)
- The **Connoisseur Score** (circular badge) is a deeper, more meaningful assessment based on review analysis across multiple quality pillars
- A score badge with no number means insufficient data (not a negative judgment)
- Verified scores carry more weight than estimated ones

## Design
A collapsible/accordion-style section with an "Info" icon and title like **"How We Rank"**, placed just above the Lounges/Shops grid. Collapsed by default to keep the page clean, but easy to expand for curious visitors.

**Content when expanded:**
1. **City Rankings** -- Venues are ranked by a weighted combination of Google rating and review count, so popular and highly-rated spots rise to the top.
2. **Connoisseur Score** -- A separate quality score (shown as the circular badge) that analyzes reviews across pillars like cigar selection, ambiance, service, drinks, and value. This score is a more meaningful indicator than star ratings alone.
3. **Estimated vs Verified** -- Estimated scores (dashed border) are AI-analyzed from public reviews. Verified scores (solid border, glowing) come from community member ratings and carry more weight.
4. **No Score Shown** -- If a venue doesn't display a score, it simply means there wasn't enough data to rate it fairly -- it's not a negative mark.

## Technical Details

### New Component: `src/components/ScoreExplainer.tsx`
- A reusable collapsible panel using the existing `Collapsible` component from Radix
- Uses `Info` icon from lucide-react
- Styled to match existing design system (font-display for headings, font-body for text, muted-foreground colors)

### Edit: `src/pages/CityPage.tsx`
- Import and place `<ScoreExplainer />` between the hero section and the lounges grid (around line 182, before the grid rendering)

No database or backend changes required.

