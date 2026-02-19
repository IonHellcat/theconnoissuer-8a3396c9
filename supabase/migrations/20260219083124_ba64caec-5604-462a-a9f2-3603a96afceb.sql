
CREATE UNIQUE INDEX IF NOT EXISTS idx_lounges_google_place_id 
  ON public.lounges (google_place_id) 
  WHERE google_place_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_lounges_google_place_id 
  ON public.pending_lounges (google_place_id) 
  WHERE google_place_id IS NOT NULL;
