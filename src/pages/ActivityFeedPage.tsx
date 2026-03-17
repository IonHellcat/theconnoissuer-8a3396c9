import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Rss, Trophy, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OptimizedImage from "@/components/OptimizedImage";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const ActivityFeedPage = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: followingIds } = useQuery({
    queryKey: ["following", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user!.id);
      if (error) throw error;
      return data.map((f: any) => f.following_id);
    },
    enabled: !!user,
  });

  const { data: feed, isLoading } = useQuery({
    queryKey: ["activity-feed", user?.id, followingIds],
    queryFn: async () => {
      if (!followingIds || followingIds.length === 0) return [];

      // Get visits from followed users
      const { data: visits } = await supabase
        .from("visits")
        .select("user_id, visited_at, lounges!inner(name, slug, image_url, cities!inner(name))")
        .in("user_id", followingIds)
        .order("visited_at", { ascending: false })
        .limit(100);

      // Get reviews from followed users
      const { data: reviews } = await supabase
        .from("reviews")
        .select("user_id, created_at, lounges!inner(name, slug, image_url, cities!inner(name))")
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(100);

      // Get profiles for all actors
      const actorIds = new Set([
        ...(visits || []).map((v: any) => v.user_id),
        ...(reviews || []).map((r: any) => r.user_id),
      ]);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", Array.from(actorIds));

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const items = [
        ...(visits || []).map((v: any) => ({
          action_type: "visited" as const,
          actor_id: v.user_id,
          actor_display_name: profileMap.get(v.user_id)?.display_name || "Member",
          actor_avatar_url: profileMap.get(v.user_id)?.avatar_url,
          lounge_name: v.lounges.name,
          lounge_slug: v.lounges.slug,
          lounge_image_url: v.lounges.image_url,
          city_name: v.lounges.cities?.name,
          created_at: v.visited_at,
        })),
        ...(reviews || []).map((r: any) => ({
          action_type: "reviewed" as const,
          actor_id: r.user_id,
          actor_display_name: profileMap.get(r.user_id)?.display_name || "Member",
          actor_avatar_url: profileMap.get(r.user_id)?.avatar_url,
          lounge_name: r.lounges.name,
          lounge_slug: r.lounges.slug,
          lounge_image_url: r.lounges.image_url,
          city_name: r.lounges.cities?.name,
          created_at: r.created_at,
        })),
      ];

      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return items.slice(0, 200);
    },
    enabled: !!user && !!followingIds,
    staleTime: 60_000,
  });

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Feed — The Connoisseur</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />
      <main className="pt-24 pb-20 md:pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <Rss className="h-6 w-6 text-primary" />
              <h1 className="font-display text-2xl font-bold text-foreground">Following</h1>
            </div>
            <p className="text-sm text-muted-foreground font-body">What your network has been up to</p>
          </motion.div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : !feed || feed.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24">
              <Rss className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">No activity yet</h2>
              <p className="text-muted-foreground font-body max-w-sm mx-auto mb-6">
                Follow other connoisseurs to see their activity here
              </p>
              <Link to="/leaderboard">
                <Button variant="outline">
                  <Trophy className="h-4 w-4 mr-2" />
                  Browse Leaderboard
                </Button>
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {feed.map((item: any, i: number) => (
                <motion.div
                  key={`${item.action_type}-${item.actor_id}-${item.created_at}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 bg-card rounded-xl border border-border/50 p-3"
                >
                  <Link to={`/user/${item.actor_id}`} className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                      {item.actor_avatar_url ? (
                        <img src={item.actor_avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body text-foreground">
                      <Link to={`/user/${item.actor_id}`} className="font-semibold hover:text-primary transition-colors">
                        {item.actor_display_name}
                      </Link>{" "}
                      {item.action_type === "visited" ? "visited" : "reviewed"}{" "}
                      <Link to={`/lounge/${item.lounge_slug}`} className="font-semibold hover:text-primary transition-colors">
                        {item.lounge_name}
                      </Link>
                      {item.city_name && <span className="text-muted-foreground"> in {item.city_name}</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-body mt-0.5">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {item.lounge_image_url && (
                    <Link to={`/lounge/${item.lounge_slug}`} className="flex-shrink-0">
                      <OptimizedImage
                        src={item.lounge_image_url}
                        alt={item.lounge_name}
                        width={80}
                        height={60}
                        sizes="60px"
                        widths={[60, 120]}
                        className="w-14 h-10 rounded-lg object-cover"
                      />
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ActivityFeedPage;
