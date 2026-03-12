
-- Table to track deleted lounges so they never get re-imported
CREATE TABLE public.deleted_lounges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id text,
  name text NOT NULL,
  city_name text,
  deleted_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.deleted_lounges ENABLE ROW LEVEL SECURITY;

-- Only admins can manage deleted lounges
CREATE POLICY "Admins can select deleted lounges" ON public.deleted_lounges FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert deleted lounges" ON public.deleted_lounges FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role full access deleted lounges" ON public.deleted_lounges FOR ALL TO public USING (auth.role() = 'service_role'::text);

-- Allow admins to delete from lounges table
CREATE POLICY "Admins can delete lounges" ON public.lounges FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete from favorites (for cascade cleanup)
CREATE POLICY "Admins can delete favorites" ON public.favorites FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete user reviews on a lounge (cleanup)
CREATE POLICY "Admins can delete reviews" ON public.reviews FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
