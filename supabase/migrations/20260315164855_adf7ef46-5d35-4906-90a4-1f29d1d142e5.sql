
CREATE TABLE public.guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  meta_description text NOT NULL,
  hero_subtitle text,
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  guide_type text NOT NULL DEFAULT 'country',
  country text,
  related_city_slugs text[] DEFAULT '{}'::text[],
  published boolean DEFAULT false,
  published_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published guides are publicly readable"
  ON public.guides FOR SELECT
  TO public
  USING (published = true);

CREATE POLICY "Admins can do everything with guides"
  ON public.guides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
