
-- Fix the view to use SECURITY INVOKER
DROP VIEW IF EXISTS public.following_activity;
CREATE VIEW public.following_activity WITH (security_invoker = true) AS
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
LEFT JOIN public.profiles p ON p.user_id = r.user_id;

-- Create storage bucket for visit photos
INSERT INTO storage.buckets (id, name, public) VALUES ('visit-photos', 'visit-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for visit-photos
CREATE POLICY "Anyone can read visit photos" ON storage.objects FOR SELECT USING (bucket_id = 'visit-photos');
CREATE POLICY "Users can upload visit photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'visit-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own visit photos" ON storage.objects FOR DELETE USING (bucket_id = 'visit-photos' AND auth.uid() IS NOT NULL);
