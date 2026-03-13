import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { User, Star, Heart, Share2, MapPinCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OptimizedImage from "@/components/OptimizedImage";
import { useToast } from "@/hooks/use-toast";

const PublicProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: reviews } = useQuery({
    queryKey: ["public-reviews", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, lounges!inner(name, slug, image_url, cities!inner(name))")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: favorites } = useQuery({
    queryKey: ["public-favorites", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("*, lounges!inner(name, slug, image_url, rating, cities!inner(name))")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: visits } = useQuery({
    queryKey: ["public-visits", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visits")
        .select("*, lounges!inner(name, slug, image_url, cities!inner(name))")
        .eq("user_id", userId!)
        .order("visited_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const displayName = profile?.display_name || "Member";

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `${displayName} on The Connoisseur`, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{profile ? `${displayName} — The Connoisseur` : "Profile — The Connoisseur"}</title>
        <meta
          name="description"
          content={`${displayName}'s cigar lounge reviews and favorites on The Connoisseur.`}
        />
        <meta property="og:title" content={`${displayName} — The Connoisseur`} />
        <meta
          property="og:description"
          content={`${displayName}'s cigar lounge reviews and favorites.`}
        />
      </Helmet>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {profileLoading ? (
            <div className="space-y-4">
              <div className="h-32 rounded-xl bg-secondary animate-pulse" />
              <div className="h-64 rounded-xl bg-secondary animate-pulse" />
            </div>
          ) : !profile ? (
            <div className="text-center py-32">
              <User className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-body text-lg">Profile not found</p>
              <Link to="/" className="text-primary text-sm mt-4 inline-block font-body hover:underline">
                Go home
              </Link>
            </div>
          ) : (
            <>
              {/* Profile Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border border-border/50 p-6 sm:p-8 mb-8"
              >
                <div className="flex items-start gap-5">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h1 className="font-display text-2xl font-bold text-foreground truncate">
                        {displayName}
                      </h1>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleShare}
                        className="text-muted-foreground hover:text-foreground flex-shrink-0"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {profile.bio && (
                      <p className="text-sm text-muted-foreground font-body mt-1 line-clamp-3">
                        {profile.bio}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground font-body">
                      <span>{reviews?.length || 0} reviews</span>
                      <span>{favorites?.length || 0} favorites</span>
                      <span>{visits?.length || 0} visited</span>
                      <span>
                        Member since{" "}
                        {new Date(profile.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Favorites */}
              {favorites && favorites.length > 0 && (
                <section className="mb-10">
                  <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Heart className="h-5 w-5 text-primary" />
                    Favorites
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {favorites.map((fav: any) => (
                      <Link
                        key={fav.id}
                        to={`/lounge/${fav.lounges.slug}`}
                        className="group block rounded-xl overflow-hidden bg-card border border-border/50 hover:border-primary/30 transition-colors"
                      >
                        <div className="aspect-[4/3] overflow-hidden">
                          <OptimizedImage
                            src={fav.lounges.image_url || "/placeholder.svg"}
                            alt={fav.lounges.name}
                            width={320}
                            height={240}
                            sizes="(max-width: 640px) 50vw, 200px"
                            widths={[160, 320]}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className="p-3">
                          <h3 className="font-display text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {fav.lounges.name}
                          </h3>
                          <p className="text-xs text-muted-foreground font-body mt-0.5">
                            {fav.lounges.cities?.name}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Reviews */}
              <section>
                <h2 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Reviews
                </h2>
                {!reviews || reviews.length === 0 ? (
                  <div className="text-center py-12 bg-card rounded-xl border border-border/50">
                    <Star className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground font-body">No reviews yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review: any) => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card rounded-xl border border-border/50 p-5"
                      >
                        <div className="flex items-start gap-4">
                          <Link
                            to={`/lounge/${review.lounges.slug}`}
                            className="hidden sm:block w-20 h-20 rounded-lg overflow-hidden flex-shrink-0"
                          >
                            <OptimizedImage
                              src={review.lounges.image_url || "/placeholder.svg"}
                              alt={review.lounges.name}
                              width={160}
                              height={160}
                              sizes="80px"
                              widths={[80, 160]}
                              className="w-full h-full object-cover"
                            />
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/lounge/${review.lounges.slug}`}
                              className="font-display text-base font-bold text-foreground hover:text-primary transition-colors"
                            >
                              {review.lounges.name}
                            </Link>
                            <p className="text-xs text-muted-foreground font-body">
                              {review.lounges.cities?.name} ·{" "}
                              {new Date(review.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                            <div className="flex items-center gap-1 mt-1.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3.5 w-3.5 ${
                                    i < review.rating
                                      ? "fill-primary text-primary"
                                      : "text-muted-foreground/30"
                                  }`}
                                />
                              ))}
                            </div>
                            {review.review_text && (
                              <p className="text-sm font-body text-foreground mt-2 line-clamp-3">
                                {review.review_text}
                              </p>
                            )}
                            {(review.cigar_smoked || review.drink_pairing) && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {review.cigar_smoked && (
                                  <span className="text-xs font-body px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                                    🪵 {review.cigar_smoked}
                                  </span>
                                )}
                                {review.drink_pairing && (
                                  <span className="text-xs font-body px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                                    🥃 {review.drink_pairing}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PublicProfilePage;
