CREATE OR REPLACE VIEW public.leaderboard_top100
WITH (security_invoker = true)
AS
SELECT
  l.id,
  l.name,
  l.slug,
  l.type,
  COALESCE(l.image_url_cached, l.image_url) AS image_url,
  l.connoisseur_score,
  l.score_label,
  l.score_source,
  l.rating,
  c.name AS city_name,
  c.slug AS city_slug,
  c.country AS city_country
FROM lounges l
JOIN cities c ON c.id = l.city_id
WHERE l.connoisseur_score IS NOT NULL
ORDER BY l.connoisseur_score DESC
LIMIT 100;