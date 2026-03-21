ALTER TABLE public.lounges ADD COLUMN IF NOT EXISTS image_url_cached text;

CREATE INDEX IF NOT EXISTS idx_lounges_image_url_cached ON public.lounges(id) WHERE image_url_cached IS NULL AND image_url IS NOT NULL;