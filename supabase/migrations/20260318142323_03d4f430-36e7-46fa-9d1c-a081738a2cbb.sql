ALTER TABLE public.top_lounges
  ADD CONSTRAINT top_lounges_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;