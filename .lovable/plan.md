

# Improve Venue Classification Using Google Places Data

## Problem
The current reclassification relies on stored descriptions that are mostly empty and potentially inaccurate. Google Places API provides structured type data (`primaryType` and `types` fields) that can definitively categorize businesses.

## What Changes

### 1. Database: Add `google_types` column
Add a `google_types` JSONB column to both `lounges` and `pending_lounges` tables to store the structured Google Places classification data (e.g., `{ "primaryType": "store", "types": ["store", "tobacco_shop"] }`).

### 2. Capture Google types during discovery
Update the `search-places` function to fetch and store `primaryType` and `types` from Google Places when discovering new venues. This data gets saved into the new `google_types` column and is also passed to the AI filter for better initial classification.

### 3. Improve the reclassify-venues function
- Use `google_types` and `website` URL instead of descriptions in the AI prompt
- Drop description from the classification context entirely
- Upgrade the AI model from Gemini Flash Lite to Gemini 2.5 Flash for better accuracy
- The AI will see data like: `"Tobacco Palace" - 123 Main St - Google types: store, tobacco_shop - website: tobaccopalace.com`

### 4. Admin UI: Add "Reclassify" button
Add a "Reclassify Types" button on the admin pending page so you can trigger reclassification directly from the UI with progress feedback.

---

## Technical Details

### Database migration
```sql
ALTER TABLE lounges ADD COLUMN google_types jsonb DEFAULT NULL;
ALTER TABLE pending_lounges ADD COLUMN google_types jsonb DEFAULT NULL;
```

### search-places changes
- Add `places.primaryType,places.types` to `FIELD_MASK`
- Store `{ primaryType, types }` in `google_types` column on insert
- Pass Google types to the `filterAndClassifyPlaces` AI call

### reclassify-venues changes
- Fetch `google_types` and `website` instead of `description`
- Update AI prompt to reference Google type data instead of descriptions
- Switch model to `gemini-2.5-flash`

### AdminPendingPage changes
- Add a "Reclassify Types" button that calls `reclassify-venues` with `table: "pending_lounges"`
- Show batch progress (classified count, remaining)

