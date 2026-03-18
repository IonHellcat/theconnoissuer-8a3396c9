DROP POLICY IF EXISTS "Users can delete own visit photos" ON storage.objects;

CREATE POLICY "Users can delete own visit photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'visit-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);