-- Fix 1: Remove public INSERT policy on user_achievements (prevents self-granting)
DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;

-- Add service_role-only INSERT policy
CREATE POLICY "Service role can insert achievements"
ON public.user_achievements
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');

-- Fix 2: Replace public SELECT on visits with authenticated-only
DROP POLICY IF EXISTS "Visits are publicly readable" ON public.visits;

CREATE POLICY "Visits are readable by authenticated users"
ON public.visits
FOR SELECT
TO authenticated
USING (true);

-- Fix 3: Replace public SELECT on favorites with authenticated-only
DROP POLICY IF EXISTS "Favorites are publicly readable" ON public.favorites;

CREATE POLICY "Favorites are readable by authenticated users"
ON public.favorites
FOR SELECT
TO authenticated
USING (true);