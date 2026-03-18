-- visits: most queried table
CREATE INDEX IF NOT EXISTS idx_visits_user_id ON public.visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_lounge_id ON public.visits(lounge_id);
CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON public.visits(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_user_lounge ON public.visits(user_id, lounge_id);

-- reviews
CREATE INDEX IF NOT EXISTS idx_reviews_lounge_id ON public.reviews(lounge_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);

-- favorites
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_lounge_id ON public.favorites(lounge_id);

-- follows
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- feed_reactions
CREATE INDEX IF NOT EXISTS idx_feed_reactions_item_id ON public.feed_reactions(item_id);
CREATE INDEX IF NOT EXISTS idx_feed_reactions_user_id ON public.feed_reactions(user_id);

-- top_lounges
CREATE INDEX IF NOT EXISTS idx_top_lounges_user_id ON public.top_lounges(user_id);

-- user_achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);