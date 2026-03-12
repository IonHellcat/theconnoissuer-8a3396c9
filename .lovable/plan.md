

# Revamped Connoisseur Score Pipeline

## Problem
The current system asks AI to rate each pillar on a 1-5 scale directly, producing subjective and inconsistent scores. The composite score is purely AI-opinion-based with no grounding in objective data like review volume or rating consistency.

## New Approach (adapted from your spec)

The new pipeline splits AI subjectivity from deterministic math. AI only classifies sentiment (positive/negative/not_mentioned) — the actual score is computed deterministically from four weighted components.

```text
[Google Places API] → google_reviews table
           ↓
[Gemini Flash]      → review_classifications table (NEW)
           ↓
[Deterministic math] → lounges table (score columns)
           ↓
[Gemini Flash]      → lounges.score_summary
```

## What Changes

### 1. Database Schema Changes
- **New table**: `review_classifications` — caches per-review AI sentiment classifications (review_id, lounge_id, venue_type, aspects JSONB, classified_at)
- **New columns on `lounges`**: `confidence` (text), `review_data_count` (integer), `scored_at` (timestamptz)
- RLS: public SELECT, admin/service_role full access (matching existing patterns)

### 2. New Scoring Formula (deterministic, no AI)
| Component | Weight | Source |
|-----------|--------|--------|
| **Quality Score** | 35% | Bayesian-adjusted Google rating mapped to 0-100 |
| **Sentiment Score** | 30% | Average of overall_sentiment from classifications |
| **Volume Score** | 25% | Log-scaled review count (rewards battle-tested venues) |
| **Consistency Score** | 10% | Inverse of rating standard deviation |

This replaces the current system where AI assigns arbitrary 1-5 pillar scores and a weighted average produces the final number.

### 3. New AI Classification Prompt
Instead of asking AI to rate pillars 1-5, we ask it to classify each review's sentiment per aspect as `positive`, `negative`, or `not_mentioned`. Results are cached so re-scoring never needs AI calls.

**Lounge aspects**: atmosphere, service, cigar_selection, drinks
**Shop aspects**: selection, staff, pricing

### 4. New `pillar_scores` Format
Changes from `{ "ambiance": 4.0, "service": 3.5, ... }` to:
```json
{
  "atmosphere": { "sentiment": "strength", "positive": 14, "negative": 1, "total": 15 },
  "service": { "sentiment": "positive", "positive": 9, "negative": 2, "total": 11 }
}
```

### 5. Edge Function Rewrite (`bootstrap-scores`)
New actions replacing existing ones:
- **`classify`** — sends reviews to Gemini in batches of 15, caches results in `review_classifications`. Skips already-classified reviews.
- **`compute-scores`** — pure math, no AI. Reads classifications + google_reviews, computes the 4-component score, writes to lounges.
- **`summarize`** — generates one-sentence summary from aspect highlights + top review snippets.
- **`bulk-pipeline`** — runs classify → compute → summarize in chunks for all venues.
- Keep existing `fetch-reviews`, `mark-no-reviews`, `save` actions.

### 6. Frontend Updates
- **LoungePage.tsx** — update pillar breakdown to show the new format (sentiment labels like "Strength", "Mixed" with positive/negative counts instead of numeric scores)
- **ScoreLoungeRow.tsx / BootstrapScoresPage.tsx** — update admin UI to work with new classification-based flow and show confidence levels
- **scoreHelpers.tsx** — update interfaces and pillar constants to match new aspect names
- **ConnoisseurScoreBadge.tsx** — add confidence indicator (high/medium/low)
- **ScoreExplainer.tsx** — update "How We Rank" copy to reflect the new 4-component formula

### 7. Adaptations from the Spec
- **No Outscraper** — keep using Google Places API (already working in `fetch-reviews` action)
- **No Claude** — use Gemini 2.5 Flash via Lovable AI gateway (already configured)
- **No Python CLI** — everything runs as edge functions triggered from the admin UI
- **No CHECK constraints** — use validation triggers per project guidelines

## Implementation Order
1. Run database migration (new table + new columns)
2. Rewrite the `bootstrap-scores` edge function with new actions
3. Update admin UI (BootstrapScoresPage) to use the new classify → compute → summarize flow
4. Update public-facing LoungePage pillar display for the new format
5. Update score explainer and badge components

