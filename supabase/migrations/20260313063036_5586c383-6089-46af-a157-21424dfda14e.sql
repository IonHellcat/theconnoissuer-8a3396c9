
CREATE TABLE public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lounge_id uuid REFERENCES public.lounges(id) ON DELETE CASCADE NOT NULL,
  visited_at timestamptz NOT NULL DEFAULT now(),
  note text,
  UNIQUE (user_id, lounge_id)
);

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own visits"
  ON public.visits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own visits"
  ON public.visits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own visits"
  ON public.visits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own visits"
  ON public.visits FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Visits are publicly readable"
  ON public.visits FOR SELECT
  TO public
  USING (true);
