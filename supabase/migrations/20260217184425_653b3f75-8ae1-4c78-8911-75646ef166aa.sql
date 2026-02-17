
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS on user_roles: admins can read all, users can read their own
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Add google_place_id to lounges
ALTER TABLE public.lounges ADD COLUMN google_place_id text;
CREATE UNIQUE INDEX idx_lounges_google_place_id ON public.lounges (google_place_id) WHERE google_place_id IS NOT NULL;

-- Create pending_lounges table
CREATE TABLE public.pending_lounges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  type text NOT NULL DEFAULT 'lounge',
  description text,
  address text,
  phone text,
  website text,
  image_url text,
  gallery text[] DEFAULT '{}'::text[],
  features text[] DEFAULT '{}'::text[],
  cigar_highlights text[] DEFAULT '{}'::text[],
  hours jsonb,
  latitude numeric,
  longitude numeric,
  rating numeric DEFAULT 0,
  review_count integer DEFAULT 0,
  price_tier integer DEFAULT 2,
  city_name text NOT NULL,
  country text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'manual',
  google_place_id text,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_lounges ENABLE ROW LEVEL SECURITY;

-- Only admins can access pending_lounges
CREATE POLICY "Admins can select pending lounges"
  ON public.pending_lounges FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert pending lounges"
  ON public.pending_lounges FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pending lounges"
  ON public.pending_lounges FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pending lounges"
  ON public.pending_lounges FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow service role full access (edge functions use service role)
CREATE POLICY "Service role full access to pending lounges"
  ON public.pending_lounges FOR ALL
  USING (auth.role() = 'service_role');

-- Admins can insert/update lounges (for approval flow)
CREATE POLICY "Admins can insert lounges"
  ON public.lounges FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update lounges"
  ON public.lounges FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert/update cities (for auto-creating cities)
CREATE POLICY "Admins can insert cities"
  ON public.cities FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update cities"
  ON public.cities FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Dedup index on pending_lounges
CREATE UNIQUE INDEX idx_pending_google_place_id ON public.pending_lounges (google_place_id) WHERE google_place_id IS NOT NULL;

-- Trigger for updated_at on pending_lounges
CREATE TRIGGER update_pending_lounges_updated_at
  BEFORE UPDATE ON public.pending_lounges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
