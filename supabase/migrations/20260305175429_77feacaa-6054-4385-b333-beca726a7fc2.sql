
CREATE TABLE public.lounge_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  address text,
  website text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lounge_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own suggestions"
  ON public.lounge_suggestions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own suggestions"
  ON public.lounge_suggestions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all suggestions"
  ON public.lounge_suggestions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update suggestions"
  ON public.lounge_suggestions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete suggestions"
  ON public.lounge_suggestions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
