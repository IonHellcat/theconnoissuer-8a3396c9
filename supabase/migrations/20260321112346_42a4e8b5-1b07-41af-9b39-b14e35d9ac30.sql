DROP FUNCTION IF EXISTS public.trending_lounges_this_week();

CREATE OR REPLACE FUNCTION public.trending_lounges_this_week()
 RETURNS TABLE(lounge_id uuid, lounge_name text, lounge_slug text, lounge_image_url text, lounge_image_url_cached text, connoisseur_score integer, score_label text, score_source text, lounge_rating numeric, city_name text, visit_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    l.id AS lounge_id,
    l.name AS lounge_name,
    l.slug AS lounge_slug,
    l.image_url AS lounge_image_url,
    l.image_url_cached AS lounge_image_url_cached,
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
  GROUP BY l.id, l.name, l.slug, l.image_url, l.image_url_cached, l.connoisseur_score,
           l.score_label, l.score_source, l.rating, c.name
  HAVING COUNT(*) >= 1
  ORDER BY COUNT(*) DESC
  LIMIT 6
$function$;