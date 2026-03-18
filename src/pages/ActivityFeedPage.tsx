import { Link, Navigate, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  Rss,
  Trophy,
  User,
  Star,
  Flame,
  Cigarette,
  Wine,
  ArrowRight,
  MapPin,
  Award,
  Crown,
  Map as MapIcon,
  Globe,
  PenLine,
  BookOpen,
  Heart,
  type LucideIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OptimizedImage from "@/components/OptimizedImage";
import ConnoisseurScoreBadge from "@/components/ConnoisseurScoreBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

/* ── icon map (same as AchievementBadge) ── */
const iconMap: Record<string, LucideIcon> = {
  MapPin, Award, Crown, Map: MapIcon, Globe, Star, PenLine, BookOpen, Flame, Heart,
};

const tierColors: Record<string, string> = {
  bronze: "bg-amber-500/10 text-amber-500",
  silver: "bg-muted text-muted-foreground",
  gold: "bg-primary/10 text-primary",
  platinum: "bg-purple-500/10 text-purple-500",
};

/* ── types ── */
interface FeedItem {
  action_type: "visited" | "reviewed" | "achievement";
  actor_id: string;
  actor_display_name: string;
  actor_avatar_url: string | null;
  lounge_name?: string;
  lounge_slug?: string;
  lounge_image_url?: string | null;
  city_name?: string | null;
  created_at: string;
  item_id: string;
  // review-specific
  review_text?: string | null;
  rating?: number | null;
  cigar_smoked?: string | null;
  drink_pairing?: string | null;
  // lounge score
  lounge_connoisseur_score?: number | null;
  lounge_score_label?: string | null;
  lounge_score_source?: string;
  lounge_rating?: number | null;
  // achievement-specific
  achievement_name?: string;
  achievement_icon?: string;
  achievement_tier?: string;
  achievement_description?: string;
  achievement_key?: string;
}

/* ── star rating component ── */
const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        className={`h-3.5 w-3.5 ${
          s <= rating ? "fill-primary text-primary" : "text-muted-foreground/30"
        }`}
      />
    ))}
  </div>
);

/* ── reaction button ── */
const ReactionButton = ({
  itemId,
  itemType,
  count,
  reacted,
  userId,
  reactionsQueryKey,
}: {
  itemId: string;
  itemType: string;
  count: number;
  reacted: boolean;
  userId: string | undefined;
  reactionsQueryKey: readonly unknown[];
}) => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const toggle = useMutation({
    mutationFn: async () => {
      if (!userId) {
        navigate("/auth");
        return;
      }
      if (reacted) {
        await supabase
          .from("feed_reactions")
          .delete()
          .eq("user_id", userId)
          .eq("item_type", itemType)
          .eq("item_id", itemId);
      } else {
        await supabase.from("feed_reactions").insert({
          user_id: userId,
          item_type: itemType,
          item_id: itemId,
        });
      }
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: reactionsQueryKey });
      const prev = qc.getQueryData<any>(reactionsQueryKey);
      // optimistic
      qc.setQueryData(reactionsQueryKey, (old: any) => {
        if (!old) return old;
        const newCounts = { ...old.counts };
        const newUserSet = new Set(old.userReacted as Set<string>);
        if (reacted) {
          newCounts[itemId] = Math.max(0, (newCounts[itemId] || 0) - 1);
          newUserSet.delete(itemId);
        } else {
          newCounts[itemId] = (newCounts[itemId] || 0) + 1;
          newUserSet.add(itemId);
        }
        return { counts: newCounts, userReacted: newUserSet };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(reactionsQueryKey, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["feed-reactions"], exact: false });
    },
  });

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        toggle.mutate();
      }}
      className={`flex items-center gap-1 text-xs transition-colors ${
        reacted ? "text-primary font-semibold" : "text-muted-foreground hover:text-primary"
      }`}
    >
      <Flame className="h-3.5 w-3.5" />
      {count > 0 && <span>{count}</span>}
    </button>
  );
};

/* ── main page ── */
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

      // visits
      const { data: visits } = await supabase
        .from("visits")
        .select("id, user_id, visited_at, lounges!inner(name, slug, image_url, connoisseur_score, score_label, score_source, rating, cities!inner(name))")
        .in("user_id", followingIds)
        .order("visited_at", { ascending: false })
        .limit(100);

      // reviews
      const { data: reviews } = await supabase
        .from("reviews")
        .select("id, user_id, created_at, rating, review_text, cigar_smoked, drink_pairing, lounges!inner(name, slug, image_url, connoisseur_score, score_label, score_source, rating, cities!inner(name))")
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(100);

      // achievements
      const { data: achievementEvents } = await supabase
        .from("user_achievements")
        .select("user_id, achievement_key, earned_at, achievements!inner(name, icon, tier, description)")
        .in("user_id", followingIds)
        .order("earned_at", { ascending: false })
        .limit(50);

      // profiles
      const actorIds = new Set([
        ...(visits || []).map((v: any) => v.user_id),
        ...(reviews || []).map((r: any) => r.user_id),
        ...(achievementEvents || []).map((a: any) => a.user_id),
      ]);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", Array.from(actorIds));

      const profileMap = new Map<string, any>((profiles || []).map((p: any) => [p.user_id, p]));

      const items: FeedItem[] = [
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
          item_id: v.id,
          lounge_connoisseur_score: v.lounges.connoisseur_score,
          lounge_score_label: v.lounges.score_label,
          lounge_score_source: v.lounges.score_source,
          lounge_rating: v.lounges.rating,
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
          item_id: r.id,
          review_text: r.review_text,
          rating: r.rating,
          cigar_smoked: r.cigar_smoked,
          drink_pairing: r.drink_pairing,
          lounge_connoisseur_score: r.lounges.connoisseur_score,
          lounge_score_label: r.lounges.score_label,
          lounge_score_source: r.lounges.score_source,
          lounge_rating: r.lounges.rating,
        })),
        ...(achievementEvents || []).map((a: any) => ({
          action_type: "achievement" as const,
          actor_id: a.user_id,
          actor_display_name: profileMap.get(a.user_id)?.display_name || "Member",
          actor_avatar_url: profileMap.get(a.user_id)?.avatar_url,
          created_at: a.earned_at,
          item_id: `${a.user_id}_${a.achievement_key}`,
          achievement_name: a.achievements.name,
          achievement_icon: a.achievements.icon,
          achievement_tier: a.achievements.tier,
          achievement_description: a.achievements.description,
          achievement_key: a.achievement_key,
        })),
      ];

      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return items.slice(0, 200);
    },
    enabled: !!user && !!followingIds,
    staleTime: 60_000,
  });

  // batch reactions query
  const feedItemIds = feed?.map((i) => i.item_id) || [];
  const { data: reactions } = useQuery({
    queryKey: ["feed-reactions", feedItemIds],
    queryFn: async () => {
      if (feedItemIds.length === 0) return { counts: {}, userReacted: new Set<string>() };
      const { data } = await supabase
        .from("feed_reactions")
        .select("item_id, user_id")
        .in("item_id", feedItemIds);
      const counts: Record<string, number> = {};
      const userReacted = new Set<string>();
      (data || []).forEach((r: any) => {
        counts[r.item_id] = (counts[r.item_id] || 0) + 1;
        if (r.user_id === user?.id) userReacted.add(r.item_id);
      });
      return { counts, userReacted };
    },
    enabled: !!feed && feed.length > 0,
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
              {feed.map((item, i) => (
                <FeedCard
                  key={`${item.action_type}-${item.item_id}`}
                  item={item}
                  index={i}
                  userId={user?.id}
                  reactionCount={reactions?.counts[item.item_id] || 0}
                  userReacted={reactions?.userReacted.has(item.item_id) || false}
                  reactionsQueryKey={["feed-reactions", feedItemIds]}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

/* ── feed card ── */
const FeedCard = ({
  item,
  index,
  userId,
  reactionCount,
  userReacted,
  reactionsQueryKey,
}: {
  item: FeedItem;
  index: number;
  userId: string | undefined;
  reactionCount: number;
  userReacted: boolean;
  reactionsQueryKey: readonly unknown[];
}) => {
  const isReview = item.action_type === "reviewed";
  const isAchievement = item.action_type === "achievement";
  const isVisit = item.action_type === "visited";

  const borderClass = isReview
    ? "border border-border/50 border-l-2 border-l-primary/30"
    : isAchievement
    ? "border border-border/50 border-l-2 border-l-purple-500/30"
    : "border border-border/50";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`bg-card rounded-xl p-4 ${borderClass}`}
    >
      <div className="flex items-start gap-3">
        {/* avatar */}
        <Link to={`/user/${item.actor_id}`} className="flex-shrink-0">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
            {item.actor_avatar_url ? (
              <img src={item.actor_avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-5 w-5 text-primary" />
            )}
          </div>
        </Link>

        {/* content */}
        <div className="flex-1 min-w-0">
          {/* header line */}
          <p className="text-sm font-body text-foreground">
            <Link to={`/user/${item.actor_id}`} className="font-semibold hover:text-primary transition-colors">
              {item.actor_display_name}
            </Link>{" "}
            {isAchievement ? "earned" : isReview ? "reviewed" : "visited"}{" "}
            {isAchievement ? (
              <span className="font-semibold">{item.achievement_name}</span>
            ) : (
              <Link to={`/lounge/${item.lounge_slug}`} className="font-semibold hover:text-primary transition-colors">
                {item.lounge_name}
              </Link>
            )}
            {!isAchievement && item.city_name && (
              <span className="text-muted-foreground"> in {item.city_name}</span>
            )}
          </p>

          {/* sub-line */}
          {isVisit && (
            <div className="flex items-center gap-2 mt-1">
              <ConnoisseurScoreBadge
                score={item.lounge_connoisseur_score ?? null}
                scoreLabel={item.lounge_score_label ?? null}
                scoreSource={item.lounge_score_source ?? "none"}
                googleRating={item.lounge_rating ? Number(item.lounge_rating) : undefined}
                size="sm"
              />
              <span className="text-[10px] text-muted-foreground font-body">
                · {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </span>
            </div>
          )}

          {isReview && (
            <div className="mt-1.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-body">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </span>
              </div>
              {item.rating && <StarRating rating={item.rating} />}
              {item.review_text && (
                <p className="text-sm font-body italic text-muted-foreground line-clamp-2">
                  "{item.review_text}"
                </p>
              )}
              {(item.cigar_smoked || item.drink_pairing) && (
                <div className="flex flex-wrap gap-1.5">
                  {item.cigar_smoked && (
                    <span className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                      <Cigarette className="h-3 w-3" />
                      {item.cigar_smoked}
                    </span>
                  )}
                  {item.drink_pairing && (
                    <span className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                      <Wine className="h-3 w-3" />
                      {item.drink_pairing}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {isAchievement && (
            <div className="mt-0.5">
              {item.achievement_description && (
                <span className="text-xs text-muted-foreground font-body">{item.achievement_description}</span>
              )}
              <span className="text-[10px] text-muted-foreground font-body">
                {" "}· {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </span>
            </div>
          )}

          {/* footer: view lounge link + reaction */}
          <div className="flex items-center justify-between mt-2">
            {(isVisit || isReview) && item.lounge_slug ? (
              <Link
                to={`/lounge/${item.lounge_slug}`}
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                View lounge <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <div />
            )}
            <ReactionButton
              itemId={item.item_id}
              itemType={item.action_type === "visited" ? "visit" : item.action_type === "reviewed" ? "review" : "achievement"}
              count={reactionCount}
              reacted={userReacted}
              userId={userId}
              reactionsQueryKey={reactionsQueryKey}
            />
          </div>
        </div>

        {/* right side: lounge image or achievement badge */}
        {isAchievement ? (
          <AchievementBadgeIcon icon={item.achievement_icon} tier={item.achievement_tier} />
        ) : item.lounge_image_url ? (
          <Link to={`/lounge/${item.lounge_slug}`} className="flex-shrink-0">
            <OptimizedImage
              src={item.lounge_image_url}
              alt={item.lounge_name || ""}
              width={80}
              height={60}
              sizes="60px"
              widths={[60, 120]}
              className="w-14 h-[42px] rounded-lg object-cover"
            />
          </Link>
        ) : null}
      </div>
    </motion.div>
  );
};

/* ── achievement icon badge ── */
const AchievementBadgeIcon = ({ icon, tier }: { icon?: string; tier?: string }) => {
  const Icon = iconMap[icon || ""] || Star;
  const colors = tierColors[tier || "bronze"] || tierColors.bronze;

  return (
    <div className={`flex-shrink-0 h-[42px] w-[42px] rounded-lg flex items-center justify-center ${colors}`}>
      <Icon className="h-5 w-5" />
    </div>
  );
};

export default ActivityFeedPage;
