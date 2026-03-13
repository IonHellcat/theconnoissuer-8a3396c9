
CREATE OR REPLACE VIEW public.leaderboard_top100 AS
SELECT
  l.id,
  l.name,
  l.slug,
  l.type,
  l.image_url,
  l.connoisseur_score,
  l.score_label,
  l.score_source,
  l.rating,
  c.name  AS city_name,
  c.slug  AS city_slug,
  c.country AS city_country
FROM public.lounges l
JOIN public.cities c ON c.id = l.city_id
WHERE l.connoisseur_score IS NOT NULL
ORDER BY l.connoisseur_score DESC
LIMIT 100;
