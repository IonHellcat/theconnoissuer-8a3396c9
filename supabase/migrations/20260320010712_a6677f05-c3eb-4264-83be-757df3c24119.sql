INSERT INTO storage.buckets (id, name, public)
VALUES ('lounge-images', 'lounge-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for lounge images"
ON storage.objects FOR SELECT
USING (bucket_id = 'lounge-images');

CREATE POLICY "Service role can upload lounge images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lounge-images' AND auth.role() = 'service_role');

CREATE POLICY "Service role can update lounge images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'lounge-images' AND auth.role() = 'service_role');

CREATE POLICY "Service role can delete lounge images"
ON storage.objects FOR DELETE
USING (bucket_id = 'lounge-images' AND auth.role() = 'service_role');