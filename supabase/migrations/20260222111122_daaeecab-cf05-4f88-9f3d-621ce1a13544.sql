-- Allow public read access to favorites so public profiles can show them
CREATE POLICY "Favorites are publicly readable"
ON public.favorites
FOR SELECT
USING (true);