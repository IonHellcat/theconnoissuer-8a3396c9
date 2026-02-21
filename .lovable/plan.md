

# Handle Zero Scores as Null

## Problem
When a lounge has insufficient reviews or all pillar scores come back as null, `calculateCompositeScore` returns `0`. This `0` gets saved to the database and displayed as an actual score, which is misleading.

## Changes

### 1. Edge Function (`supabase/functions/bootstrap-scores/index.ts`)

In the `analyze` action response block, after calculating the composite score:
- If `compositeScore === 0`, set it to `null` instead
- If score is `null`, set `scoreLabel` to `null` as well
- This ensures no lounge gets a misleading "0" score saved

The `calculateCompositeScore` function itself can stay as-is (returning 0 when no data). The guard happens at the response level:

```
const finalScore = compositeScore === 0 ? null : compositeScore;
const finalLabel = finalScore === null ? null : scoreLabel;
```

### 2. Frontend Badge (`src/components/ConnoisseurScoreBadge.tsx`)

No changes needed -- the badge already handles `score === null` by falling back to Google rating or showing nothing.

### 3. Admin Page (`src/pages/BootstrapScoresPage.tsx`)

In the results display, if score is `null`, show a dash "-" instead of "0" so the admin knows it means "insufficient data" rather than a real rating.

---

## Summary
Two small edits: one in the edge function to return `null` instead of `0`, and one on the admin page to display "-" for null scores.

