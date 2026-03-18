-- Revert visits to publicly readable
DROP POLICY IF EXISTS "Visits are readable by authenticated users" ON public.visits;

CREATE POLICY "Visits are publicly readable"
ON public.visits
FOR SELECT
TO public
USING (true);

-- Revert favorites to publicly readable
DROP POLICY IF EXISTS "Favorites are readable by authenticated users" ON public.favorites;

CREATE POLICY "Favorites are publicly readable"
ON public.favorites
FOR SELECT
TO public
USING (true);