CREATE TABLE public.top_lounges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lounge_id uuid REFERENCES public.lounges(id) ON DELETE CASCADE NOT NULL,
  position integer NOT NULL CHECK (position BETWEEN 1 AND 4),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, position),
  UNIQUE (user_id, lounge_id)
);

ALTER TABLE public.top_lounges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read top lounges"
  ON public.top_lounges FOR SELECT USING (true);

CREATE POLICY "Users can manage their own top lounges"
  ON public.top_lounges FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);