import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ReviewListProps {
  loungeId: string;
}

const ReviewList = ({ loungeId }: ReviewListProps) => {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["reviews", loungeId],
    queryFn: async () => {
      const { data: reviewsData, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("lounge_id", loungeId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch profiles for review authors
      const userIds = [...new Set(reviewsData.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      return reviewsData.map((r) => ({ ...r, profile: profileMap.get(r.user_id) || null }));
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <p className="text-muted-foreground font-body text-sm py-4">
        No reviews yet. Be the first to share your experience!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const profile = review.profile as any;
        return (
          <div key={review.id} className="bg-card rounded-xl border border-border/50 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Link to={`/user/${review.user_id}`} className="flex items-center gap-2 group">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-sm font-body font-medium text-foreground group-hover:bg-primary/20 transition-colors">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    (profile?.display_name || "?")[0].toUpperCase()
                  )}
                </div>
                <span className="font-body text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {profile?.display_name || "Anonymous"}
                </span>
              </Link>
              <span className="text-xs text-muted-foreground font-body">
                {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
              </span>
            </div>

            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= review.rating ? "fill-primary text-primary" : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>

            {review.review_text && (
              <p className="text-sm text-foreground font-body leading-relaxed">{review.review_text}</p>
            )}

            {(review.cigar_smoked || review.drink_pairing) && (
              <div className="flex flex-wrap gap-2">
                {review.cigar_smoked && (
                  <span className="text-xs font-body px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                    🚬 {review.cigar_smoked}
                  </span>
                )}
                {review.drink_pairing && (
                  <span className="text-xs font-body px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                    🥃 {review.drink_pairing}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ReviewList;
