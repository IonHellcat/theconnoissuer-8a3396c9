ALTER TABLE public.lounges ADD COLUMN IF NOT EXISTS visit_type text DEFAULT 'Both';

-- Add a validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_lounge_visit_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.visit_type IS NOT NULL AND NEW.visit_type NOT IN ('Quick Smoke', 'Full Evening', 'Both') THEN
    RAISE EXCEPTION 'visit_type must be Quick Smoke, Full Evening, or Both';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_lounge_visit_type
  BEFORE INSERT OR UPDATE ON public.lounges
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lounge_visit_type();