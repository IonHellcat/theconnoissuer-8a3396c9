
-- FEATURE 1: Achievements system
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  tier text NOT NULL,
  condition_type text NOT NULL,
  condition_value integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_key text REFERENCES public.achievements(key) NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE (user_id, achievement_key)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Achievements are readable by everyone
CREATE POLICY "Anyone can read achievements" ON public.achievements FOR SELECT USING (true);

-- User achievements: anyone can read, users can insert their own
CREATE POLICY "Anyone can read user_achievements" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "Users can insert own achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Seed achievements
INSERT INTO public.achievements (key, name, description, icon, tier, condition_type, condition_value) VALUES
  ('first_visit', 'First Light', 'Checked into your first lounge', 'MapPin', 'bronze', 'visit_count', 1),
  ('veteran', 'Veteran', 'Visited 25 lounges', 'Award', 'silver', 'visit_count', 25),
  ('centurion', 'Centurion', 'Visited 100 lounges', 'Crown', 'gold', 'visit_count', 100),
  ('road_tripper', 'Road Tripper', 'Visited lounges in 5 cities', 'Map', 'bronze', 'city_count', 5),
  ('globe_trotter', 'Globe Trotter', 'Visited lounges in 10 countries', 'Globe', 'gold', 'country_count', 10),
  ('first_review', 'Critic''s Eye', 'Wrote your first review', 'Star', 'bronze', 'review_count', 1),
  ('prolific', 'Prolific', 'Wrote 25 reviews', 'PenLine', 'silver', 'review_count', 25),
  ('authority', 'The Authority', 'Wrote 100 reviews', 'BookOpen', 'platinum', 'review_count', 100),
  ('trendsetter', 'Trendsetter', 'First to review a lounge', 'Flame', 'silver', 'first_review', 1),
  ('devoted', 'Devoted', 'Visited the same lounge 3+ times', 'Heart', 'silver', 'repeat_visit', 3);

-- FEATURE 2: Social following
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can insert own follows" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can delete own follows" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Activity feed view
CREATE OR REPLACE VIEW public.following_activity AS
SELECT
  'visited' AS action_type,
  v.user_id AS actor_id,
  p.display_name AS actor_display_name,
  p.avatar_url AS actor_avatar_url,
  l.name AS lounge_name,
  l.slug AS lounge_slug,
  l.image_url AS lounge_image_url,
  c.name AS city_name,
  v.visited_at AS created_at
FROM public.visits v
JOIN public.lounges l ON l.id = v.lounge_id
JOIN public.cities c ON c.id = l.city_id
LEFT JOIN public.profiles p ON p.user_id = v.user_id
UNION ALL
SELECT
  'reviewed' AS action_type,
  r.user_id AS actor_id,
  p.display_name AS actor_display_name,
  p.avatar_url AS actor_avatar_url,
  l.name AS lounge_name,
  l.slug AS lounge_slug,
  l.image_url AS lounge_image_url,
  c.name AS city_name,
  r.created_at AS created_at
FROM public.reviews r
JOIN public.lounges l ON l.id = r.lounge_id
JOIN public.cities c ON c.id = l.city_id
LEFT JOIN public.profiles p ON p.user_id = r.user_id
ORDER BY created_at DESC
LIMIT 200;

-- FEATURE 3: Add image_url to visits
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS image_url text;
