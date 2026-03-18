

## Investigation: Why Achievements Aren't Unlocking

### How It Works Currently

Achievements are checked via the `check-achievements` edge function, which is called from two places:
1. **VisitButton.tsx** -- after a successful check-in
2. **ReviewForm.tsx** -- after submitting a review

Both calls are wrapped in `try/catch {}` with empty catch blocks, so any errors are silently swallowed.

### Root Cause

The edge function has **zero logs**, meaning it was likely **never deployed** or has never been successfully invoked. The function code exists in the repo but needs to be deployed to the backend for it to work.

Additionally, there's a minor code smell on line 55 -- a dummy RPC call to `recommend_lounges` that does nothing useful but could throw an error.

### Fix Plan

1. **Deploy the `check-achievements` edge function** so it's actually available when the client calls it.

2. **Remove the dead code** on line 55 (the dummy `recommend_lounges` RPC call) to prevent potential errors.

3. **Manually trigger the function** for your user to retroactively award the `first_visit` achievement (visit_count >= 1, you have 8 visits) and any other earned achievements.

4. **Improve error visibility** -- optionally add a `console.error` in the catch blocks in `VisitButton.tsx` and `ReviewForm.tsx` so future failures aren't invisible.

No database or RLS changes needed -- the function uses the service role key which bypasses RLS, and the achievement definitions are already correctly seeded (confirmed from network request showing all 10 achievements).

