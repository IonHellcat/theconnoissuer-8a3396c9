

## Fix: Replace Lovable favicon with Connoisseur logo

### Problem
The old `public/favicon.ico` (Lovable heart logo) still exists. Browsers often auto-discover and prefer `/favicon.ico` over the PNG reference in the HTML. Additionally, `manifest.json` explicitly references `/favicon.ico`.

### Plan

1. **Delete `public/favicon.ico`** — remove the old Lovable icon file entirely so browsers can't auto-discover it.

2. **Update `manifest.json`** — change the 48x48 icon entry from `/favicon.ico` to `/favicon.png` with the correct MIME type `image/png`.

3. **Copy the uploaded logo to `public/favicon.png`** — overwrite again with the user's uploaded file (`user-uploads://Screenshot_2026-03-19_at_11.58.29.png` is a screenshot, but the previously uploaded `logooo-2.png` should be used). Actually, since the previous message already copied `logooo-2.png` to `public/favicon.png`, this step may already be done — but we should verify the file is correct.

### Files changed
- `public/favicon.ico` — deleted
- `public/manifest.json` — update icon reference from `.ico` to `.png`

