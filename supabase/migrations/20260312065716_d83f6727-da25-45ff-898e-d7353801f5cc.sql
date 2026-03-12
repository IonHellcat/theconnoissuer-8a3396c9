
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column computed from existing lat/lng
ALTER TABLE public.lounges ADD COLUMN IF NOT EXISTS geog geography(Point, 4326);

-- Populate geog from existing lat/lng data
UPDATE public.lounges
SET geog = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create spatial index
CREATE INDEX IF NOT EXISTS idx_lounges_geog ON public.lounges USING GIST (geog);

-- Create trigger to auto-update geog when lat/lng change
CREATE OR REPLACE FUNCTION public.update_lounge_geog()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geog := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.geog := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lounge_geog
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.lounges
  FOR EACH ROW EXECUTE FUNCTION public.update_lounge_geog();

-- Create the recommend_lounges RPC function
CREATE OR REPLACE FUNCTION public.recommend_lounges(
  user_lat double precision,
  user_lng double precision,
  visit_style text,
  venue_filter text DEFAULT 'All',
  radius_m double precision DEFAULT 50000
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  latitude numeric,
  longitude numeric,
  connoisseur_score integer,
  visit_type text,
  type text,
  address text,
  image_url text,
  score_label text,
  score_source text,
  score_summary text,
  rating numeric,
  city_id uuid,
  city_name text,
  city_slug text,
  distance_km double precision,
  recommendation_score double precision
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH nearby AS (
    SELECT
      l.id, l.name, l.slug, l.latitude, l.longitude,
      l.connoisseur_score, l.visit_type, l.type,
      l.address, l.image_url, l.score_label, l.score_source, l.score_summary,
      l.rating, l.city_id,
      c.name AS city_name, c.slug AS city_slug,
      ST_Distance(l.geog, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) / 1000.0 AS distance_km
    FROM public.lounges l
    JOIN public.cities c ON c.id = l.city_id
    WHERE l.geog IS NOT NULL
      AND ST_DWithin(l.geog, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, radius_m)
      AND (
        venue_filter = 'All'
        OR (venue_filter = 'Lounge' AND (l.type = 'lounge' OR l.type = 'both'))
        OR (venue_filter = 'Shop' AND (l.type = 'shop' OR l.type = 'both'))
      )
  )
  SELECT
    n.*,
    (
      COALESCE(n.connoisseur_score, 50) * 0.6
      + GREATEST(0, 100 - n.distance_km * 2) * 0.3
      + CASE WHEN n.visit_type = visit_style OR n.visit_type = 'Both' THEN 100 ELSE 0 END * 0.1
    ) AS recommendation_score
  FROM nearby n
  ORDER BY recommendation_score DESC
  LIMIT 20;
$$;
