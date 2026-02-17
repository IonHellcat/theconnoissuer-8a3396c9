

## Next Feature: User Authentication + Reviews

The most impactful next step is adding **user authentication** and **review submission**, which brings the app to life with user-generated content. Here's the plan:

---

### Phase 1: Authentication Pages

**New files:**
- `src/pages/AuthPage.tsx` -- Combined login/signup page with tab switching, matching the dark luxury theme
- `src/pages/ResetPasswordPage.tsx` -- Password reset page for the recovery flow

**Modified files:**
- `src/App.tsx` -- Add `/auth` and `/reset-password` routes
- `src/components/Navbar.tsx` -- Update the User icon and "Log In" link to navigate to `/auth`; show user avatar and logout option when authenticated

**Implementation details:**
- Email/password authentication using the built-in auth system
- Email verification required before sign-in (no auto-confirm)
- Auth state managed via `onAuthStateChange` listener
- Create a shared `useAuth` hook (`src/hooks/useAuth.tsx`) that provides session/user state across the app
- Protected actions (submitting reviews) check for auth and redirect to `/auth` if not logged in

---

### Phase 2: Review Submission on Lounge Page

**New file:**
- `src/components/ReviewForm.tsx` -- Form for rating (1-5 stars), review text, cigar smoked, and drink pairing fields
- `src/components/ReviewList.tsx` -- Displays existing reviews with user display names, ratings, and timestamps

**Modified file:**
- `src/pages/LoungePage.tsx` -- Add ReviewList and ReviewForm sections below the gallery; show "Log in to leave a review" prompt for unauthenticated users

**Implementation details:**
- Star rating selector component (clickable stars)
- Submits to the `reviews` table (RLS already configured for authenticated users)
- Fetches reviews joined with `profiles` to show display names
- Optimistic UI update after submission using React Query cache invalidation

---

### Phase 3: Explore Cities Page

**New file:**
- `src/pages/ExplorePage.tsx` -- Grid of all cities from the database, reusing the existing `CityCard` component

**Modified file:**
- `src/App.tsx` -- Add `/explore` route
- `src/components/Navbar.tsx` -- Update "Explore Cities" link to `/explore`

---

### Technical Notes

- **No database changes needed** -- all tables (profiles, reviews) and RLS policies already exist
- **Auth trigger** already set up to auto-create a profile row on signup via `handle_new_user()`
- The `useAuth` hook will wrap `supabase.auth.onAuthStateChange` and `getSession` for consistent session handling across components
- Password reset flow: forgot password sends email with redirect to `/reset-password`, where users set a new password via `updateUser()`

