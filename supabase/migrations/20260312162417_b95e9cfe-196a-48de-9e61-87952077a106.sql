
-- New table: review_classifications (caches per-review AI sentiment classifications)
CREATE TABLE public.review_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.google_reviews(id) ON DELETE CASCADE,
  lounge_id uuid NOT NULL REFERENCES public.lounges(id) ON DELETE CASCADE,
  venue_type text NOT NULL DEFAULT 'lounge',
  aspects jsonb NOT NULL DEFAULT '{}',
  classified_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id)
);

ALTER TABLE public.review_classifications ENABLE ROW LEVEL SECURITY;

-- RLS: public SELECT, admin/service_role full access
CREATE POLICY "Review classifications are publicly readable"
  ON public.review_classifications FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins can manage review classifications"
  ON public.review_classifications FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access to review classifications"
  ON public.review_classifications FOR ALL TO public
  USING (auth.role() = 'service_role'::text);

-- New columns on lounges table
ALTER TABLE public.lounges
  ADD COLUMN IF NOT EXISTS confidence text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS review_data_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scored_at timestamptz DEFAULT NULL;
