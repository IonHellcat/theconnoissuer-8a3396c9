-- Remove the policies that still allow anon/authenticated to read all columns directly
DROP POLICY IF EXISTS "Public can read visits via view" ON public.visits;
DROP POLICY IF EXISTS "Authenticated can read all visits" ON public.visits;

-- Recreate the view WITHOUT security_invoker so it runs as owner (bypasses RLS)
-- This means anon/authenticated can only see the limited columns through the view
DROP VIEW IF EXISTS public.visits_public;
CREATE VIEW public.visits_public AS
SELECT id, user_id, lounge_id, visited_at
FROM public.visits;

GRANT SELECT ON public.visits_public TO anon;
GRANT SELECT ON public.visits_public TO authenticated;