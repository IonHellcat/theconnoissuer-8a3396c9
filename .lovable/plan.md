

## Plan: Fix Outlier Fairness in Scoring Prompt + Add Fast Bulk Auto-Rescore

### Problem 1: One bad review still tanks scores
The current prompt has a fairness rule (rule #5), but the AI model is not following it strongly enough. The fix is to make the fairness instruction more prominent and add explicit examples of how to handle outlier scenarios. We'll also add a **statistical guardrail**: when there are 3+ reviews, compute the median rating and flag to the AI when a single review is a clear outlier (2+ stars below median).

### Problem 2: Bulk rescoring is too slow
Currently processes 1 venue at a time with 2s delays, capped at 50. For ~1000 venues this would take hours. The fix is to add a new `bulk-rescore` action to the edge function that processes everything server-side in one call, using the already-cached `google_reviews` table (no need to re-fetch from Google), auto-saving results directly, and processing in parallel batches.

---

### Changes

#### 1. Edge Function (`supabase/functions/bootstrap-scores/index.ts`)

**Strengthen the fairness prompt:**
- Move the fairness rule to the TOP of the rules section and make it a bold, repeated instruction
- Add concrete examples: "If 4 reviews give 5★ and 1 gives 1★, the consensus is clearly positive. Score 3.5-4.0, not 2.0"
- Add pre-processing: compute rating distribution stats and include them in the prompt so the AI sees "Rating distribution: 5★×3, 4★×1, 1★×1 — note the 1★ is a statistical outlier"
- Switch model from `google/gemini-2.5-pro` to `google/gemini-2.5-flash` for speed (sufficient quality for structured scoring)

**Add `bulk-rescore` action:**
- Query all lounges where `score_source = 'estimated'` and have a `google_place_id`
- For each, load cached reviews from `google_reviews` table (skip Google API calls entirely)
- Process in parallel batches of 3 (to stay within AI rate limits)
- Auto-save each result immediately
- Return summary stats (scored, skipped, errors)
- Add 500ms delay between batches to avoid rate limiting

#### 2. Frontend (`src/pages/BootstrapScoresPage.tsx`)

- Add a "Re-score All (Auto-save)" button that calls the new `bulk-rescore` action
- Show a progress indicator with live count updates (poll or single response)
- Remove the 50-item cap from the UI
- Keep the existing per-venue manual bootstrap for one-off use

#### 3. No database changes needed
Reviews are already cached in `google_reviews`. Scores write to `lounges` table columns that already exist.

---

### Technical Details

**Rating distribution pre-processing (edge function):**
```text
Before sending to AI, compute:
- Count per star rating
- Median rating
- Flag outliers (any review 2+ stars below median)
Include in prompt: "Rating distribution: 5★×3, 4★×1, 1★×1. The 1★ review is a statistical outlier."
```

**Bulk processing flow:**
```text
Client -> POST bulk-rescore
  Edge fn: SELECT lounges WHERE score_source='estimated' AND google_place_id IS NOT NULL
  For each lounge:
    1. SELECT reviews FROM google_reviews WHERE lounge_id = X
    2. If no cached reviews -> skip
    3. Call AI analyze (with strengthened prompt)
    4. Save result to lounges table immediately
  Return { rescored: N, skipped: N, errors: N }
```

**Parallel batching:** 3 concurrent AI calls per batch, 500ms between batches. Estimated time for 500 venues: ~15-20 minutes (vs hours with current approach).

