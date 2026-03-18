-- Recreate view with lounge + city data pre-joined for public consumers
DROP VIEW IF EXISTS public.visits_public;
CREATE VIEW public.visits_public AS
SELECT 
  v.id,
  v.user_id,
  v.lounge_id,
  v.visited_at,
  l.name AS lounge_name,
  l.slug AS lounge_slug,
  l.image_url AS lounge_image_url,
  l.connoisseur_score,
  l.score_label,
  l.score_source,
  l.rating AS lounge_rating,
  c.name AS city_name
FROM public.visits v
JOIN public.lounges l ON l.id = v.lounge_id
JOIN public.cities c ON c.id = l.city_id;

GRANT SELECT ON public.visits_public TO anon;
GRANT SELECT ON public.visits_public TO authenticated;