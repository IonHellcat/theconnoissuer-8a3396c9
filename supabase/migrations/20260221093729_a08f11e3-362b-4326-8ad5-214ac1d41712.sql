-- Fix: Restrict profiles to authenticated users only
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;
CREATE POLICY "Profiles are readable by authenticated users"
  ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Also allow service_role to read profiles (for triggers/functions)
CREATE POLICY "Service role can read profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.role() = 'service_role');