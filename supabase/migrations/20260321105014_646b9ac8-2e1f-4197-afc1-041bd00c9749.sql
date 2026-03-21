INSERT INTO storage.buckets (id, name, public) 
VALUES ('lounge-images', 'lounge-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read lounge images"
ON storage.objects FOR SELECT
USING (bucket_id = 'lounge-images');

CREATE POLICY "Service role upload lounge images"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'lounge-images');

CREATE POLICY "Service role update lounge images"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'lounge-images');