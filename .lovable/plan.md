

## Plan: Add a "Recalculate Scores Only" Action

Create a lightweight action that **only** recomputes scores from existing classified data — no API calls, no AI, no reclassification, no summary regeneration. Just the math.

### Changes

**1. Edge function (`supabase/functions/bootstrap-scores/index.ts`)**
- Add new action `"recalculate-scores-chunk"` to the valid actions list
- New handler that:
  - Fetches estimated lounges in chunks (with city_id, rating, review_count)
  - Builds `cityAvgMap` (one DB query, no API)
  - For each lounge: fetches existing `review_classifications` and `google_reviews` ratings
  - Calls `computeConnoisseurScore` with new prestige formula
  - Calls `buildPillarScores`, `computeConfidence`, `getScoreLabel`
  - Updates the lounge row (score, label, pillar_scores, confidence) — keeps existing `score_summary` untouched
  - No calls to `classifyReviewsBatch` or `generateSummary`

**2. Page (`src/pages/BootstrapScoresPage.tsx`)**
- Add a new `bulkRecalculate` function that calls `"recalculate-scores-chunk"` in a loop (same pattern as `bulkRescoreServer`)
- Wire it to a new button or repurpose the existing "Re-score Estimated" button

**3. UI (`src/components/admin/ScoreBulkActions.tsx`)**
- Add a "Recalculate Scores" button (formula icon) that triggers the lightweight recalc
- Keep existing "Re-score Estimated" for full re-classification + summary

This will be significantly faster since it's pure DB reads + math + DB writes, no external API calls.

