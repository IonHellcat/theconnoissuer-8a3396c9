-- FIX 1: reviews UPDATE missing WITH CHECK
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
CREATE POLICY "Users can update their own reviews"
ON public.reviews FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- FIX 2: visits UPDATE missing WITH CHECK
DROP POLICY IF EXISTS "Users can update their own visits" ON public.visits;
CREATE POLICY "Users can update their own visits"
ON public.visits FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- FIX 3: user_achievements self-award prevention
DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;
CREATE POLICY "Users can insert own achievements"
ON public.user_achievements FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.achievements WHERE key = achievement_key
  )
);

-- FIX 4: visit-photos upload path ownership
DROP POLICY IF EXISTS "Users can upload visit photos" ON storage.objects;
CREATE POLICY "Users can upload visit photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'visit-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);