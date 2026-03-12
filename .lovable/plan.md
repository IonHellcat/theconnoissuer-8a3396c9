

## Plan: Add Prestige Score Component to Bootstrap Scores

### Summary
Add a `computePrestigeScore` function and integrate it into the scoring formula across all three pipeline actions, adjusting weights to Quality 30%, Sentiment 25%, Volume 20%, Prestige 15%, Consistency 10%.

### Changes (all in `supabase/functions/bootstrap-scores/index.ts`)

**1. Add `computePrestigeScore` function** (after `computeConsistencyScore`, ~line 77)
- New function comparing venue review count to city average using log-scaled ratio.

**2. Update `computeConnoisseurScore`** (lines 79-96)
- Add `cityAvgReviewCount` parameter
- Add `prestige` to return type
- Call `computePrestigeScore`
- New weights: `quality * 0.30 + sentiment * 0.25 + volume * 0.20 + prestige * 0.15 + consistency * 0.10`
- Round to 1 decimal place

**3. Update `compute-scores` action** (lines 445-509)
- Add `city_id` to the lounge select query
- Fetch city lounges' review counts to compute city average
- Pass `cityAvg` to `computeConnoisseurScore`
- Destructure `prestige` from result and include in response

**4. Update `bulk-pipeline-chunk` action** (lines 586-700)
- Add `city_id` to lounge select query (line 606)
- Before the loop, fetch all lounges' `city_id, review_count` and build `cityAvgMap`
- Pass `cityAvgMap.get(lounge.city_id) ?? 50` to `computeConnoisseurScore` (line 666)

**5. Update `bulk-full-pipeline-chunk` action** (lines 706-900)
- Add `city_id` to lounge select query (line 733)
- Before processVenue, fetch city averages and build `cityAvgMap`
- Pass city average into `computeConnoisseurScore` inside `processVenue` (line 821)

### What stays untouched
- `getScoreLabel` thresholds
- `buildPillarScores`
- `classifyReviewsBatch`
- `generateSummary`
- All other functions and actions

