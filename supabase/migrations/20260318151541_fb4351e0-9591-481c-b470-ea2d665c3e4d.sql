-- Prevent multiple reviews per user per lounge
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_user_lounge_unique UNIQUE (user_id, lounge_id);

-- Add text length limits
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_text_length CHECK (char_length(review_text) <= 2000),
  ADD CONSTRAINT reviews_cigar_length CHECK (char_length(cigar_smoked) <= 200),
  ADD CONSTRAINT reviews_drink_length CHECK (char_length(drink_pairing) <= 200);