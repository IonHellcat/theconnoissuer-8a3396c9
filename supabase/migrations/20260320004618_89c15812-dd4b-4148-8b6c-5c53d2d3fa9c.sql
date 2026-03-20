
-- 1. Create a security definer function to check if a user follows another user
-- This avoids infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_following(_follower_id uuid, _following_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.follows
    WHERE follower_id = _follower_id AND following_id = _following_id
  )
$$;

-- 2. Add RLS policy: followers can read visits of people they follow
CREATE POLICY "Followers can read visits"
ON public.visits
FOR SELECT
TO authenticated
USING (
  public.is_following(auth.uid(), user_id)
);

-- 3. Add RLS policy: service_role has full access (for edge functions / RPCs)
CREATE POLICY "Service role can read all visits"
ON public.visits
FOR SELECT
TO public
USING (auth.role() = 'service_role'::text);

-- 4. Recreate the visits_public view WITH security_invoker = true
DROP VIEW IF EXISTS public.visits_public;
CREATE VIEW public.visits_public
WITH (security_invoker = true)
AS
SELECT
  v.id,
  v.user_id,
  v.lounge_id,
  v.visited_at,
  l.connoisseur_score,
  l.rating   AS lounge_rating,
  l.score_label,
  l.score_source,
  l.name     AS lounge_name,
  l.slug     AS lounge_slug,
  l.image_url AS lounge_image_url,
  c.name     AS city_name
FROM visits v
JOIN lounges l ON l.id = v.lounge_id
JOIN cities  c ON c.id = l.city_id;

-- 5. Create a security definer RPC for trending data (public/anonymous access)
-- This returns aggregated lounge visit counts without exposing individual visit rows
CREATE OR REPLACE FUNCTION public.trending_lounges_this_week()
RETURNS TABLE(
  lounge_id uuid,
  lounge_name text,
  lounge_slug text,
  lounge_image_url text,
  connoisseur_score integer,
  score_label text,
  score_source text,
  lounge_rating numeric,
  city_name text,
  visit_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.id AS lounge_id,
    l.name AS lounge_name,
    l.slug AS lounge_slug,
    l.image_url AS lounge_image_url,
    l.connoisseur_score,
    l.score_label,
    l.score_source,
    l.rating AS lounge_rating,
    c.name AS city_name,
    COUNT(*) AS visit_count
  FROM visits v
  JOIN lounges l ON l.id = v.lounge_id
  JOIN cities  c ON c.id = l.city_id
  WHERE v.visited_at >= (now() - interval '7 days')
  GROUP BY l.id, l.name, l.slug, l.image_url, l.connoisseur_score,
           l.score_label, l.score_source, l.rating, c.name
  HAVING COUNT(*) >= 1
  ORDER BY COUNT(*) DESC
  LIMIT 6
$$;
