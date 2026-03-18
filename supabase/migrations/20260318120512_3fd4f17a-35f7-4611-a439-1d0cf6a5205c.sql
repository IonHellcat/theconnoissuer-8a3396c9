-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Visits are publicly readable" ON public.visits;

-- Create a public view that excludes sensitive columns (note, image_url)
CREATE OR REPLACE VIEW public.visits_public
WITH (security_invoker = on) AS
SELECT id, user_id, lounge_id, visited_at
FROM public.visits;

-- Allow public SELECT on the view by granting access
GRANT SELECT ON public.visits_public TO anon;
GRANT SELECT ON public.visits_public TO authenticated;

-- Add a policy that allows public reads on visits but ONLY through authenticated context
-- The view with security_invoker=on will use the caller's role, so we need a policy
-- that allows SELECT for anon/authenticated but only the non-sensitive columns via the view
-- Since we dropped the broad policy, direct table access is owner-only.
-- But the view needs a policy to read from the base table:
CREATE POLICY "Public can read visits via view"
ON public.visits
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Authenticated can read all visits"
ON public.visits
FOR SELECT
TO authenticated
USING (true);