
-- Add connoisseur score columns to lounges
ALTER TABLE public.lounges
  ADD COLUMN connoisseur_score integer,
  ADD COLUMN score_label text,
  ADD COLUMN score_source text NOT NULL DEFAULT 'none',
  ADD COLUMN score_summary text,
  ADD COLUMN pillar_scores jsonb;

-- Create google_reviews table
CREATE TABLE public.google_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lounge_id uuid NOT NULL REFERENCES public.lounges(id) ON DELETE CASCADE,
  google_place_id text,
  author_name text,
  rating integer,
  review_text text,
  relative_time text,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_reviews ENABLE ROW LEVEL SECURITY;

-- Publicly readable
CREATE POLICY "Google reviews are publicly readable"
  ON public.google_reviews FOR SELECT
  USING (true);

-- Admin insert
CREATE POLICY "Admins can insert google reviews"
  ON public.google_reviews FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin update
CREATE POLICY "Admins can update google reviews"
  ON public.google_reviews FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin delete
CREATE POLICY "Admins can delete google reviews"
  ON public.google_reviews FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role full access for edge functions
CREATE POLICY "Service role full access to google reviews"
  ON public.google_reviews FOR ALL
  USING (auth.role() = 'service_role'::text);

-- Index for fast lookups by lounge
CREATE INDEX idx_google_reviews_lounge_id ON public.google_reviews(lounge_id);
