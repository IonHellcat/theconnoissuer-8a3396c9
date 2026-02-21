-- Fix profiles RLS: restore public read access for display_name/avatar_url used in reviews
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;

CREATE POLICY "Profiles are publicly readable"
  ON public.profiles
  FOR SELECT
  USING (true);