
-- Create storage bucket for city images
INSERT INTO storage.buckets (id, name, public) VALUES ('city-images', 'city-images', true);

-- Allow public read access
CREATE POLICY "City images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'city-images');

-- Allow service role to upload
CREATE POLICY "Service role can upload city images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'city-images' AND auth.role() = 'service_role');
