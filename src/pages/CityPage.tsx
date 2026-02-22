import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { MapPin, Star, ArrowLeft, Trophy, Crown, Store, Sofa } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FavoriteButton from "@/components/FavoriteButton";
import OptimizedImage from "@/components/OptimizedImage";
import ConnoisseurScoreBadge from "@/components/ConnoisseurScoreBadge";
import ScoreExplainer from "@/components/ScoreExplainer";


const priceTierLabel = (tier: number) => "$".repeat(tier);
const rankColors = ["", "text-yellow-500", "text-zinc-400", "text-amber-700", "text-primary", "text-primary"];

// Bayesian weighted score: accounts for both rating and review count
// C = minimum reviews to be considered reliable, m = global average rating
const computeWeightedScore = (rating: number, reviewCount: number, C = 10, m = 4.0) => {
  return (reviewCount / (reviewCount + C)) * rating + (C / (reviewCount + C)) * m;
};

const RankedLoungeCard = ({ lounge, rank, dimmed }: { lounge: any; rank: number; dimmed?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: Math.min(rank * 0.05, 0.3) }}
  >
    <Link
      to={`/lounge/${lounge.slug}`}
      className={`group block bg-card rounded-xl border overflow-hidden transition-colors ${
        rank <= 3 ? "border-primary/30 hover:border-primary/60" : "border-border/50 hover:border-primary/30"
      } ${dimmed ? "opacity-80" : ""}`}
    >
      {/* Vertical layout for mobile 2-col grid */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <OptimizedImage
          src={lounge.image_url || "/placeholder.svg"}
          alt={lounge.name}
          width={480}
          height={320}
          sizes="(max-width: 768px) 50vw, 288px"
          widths={[240, 480]}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-full px-2 py-0.5">
          {rank <= 3 && <Crown className={`h-3 w-3 ${rankColors[rank]}`} />}
          <span className={`text-xs font-bold font-display ${rank <= 3 ? rankColors[rank] : "text-muted-foreground"}`}>
            #{rank}
          </span>
        </div>
        <div className="absolute top-2 right-2 z-10">
          <FavoriteButton loungeId={lounge.id} />
        </div>
      </div>
      <div className="p-2.5 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] sm:text-xs font-medium font-body px-1.5 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                {lounge.type}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-body">
                {priceTierLabel(lounge.price_tier)}
              </span>
            </div>
            <h3 className="font-display text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {lounge.name}
            </h3>
            {lounge.score_summary && (
              <p className="text-[10px] sm:text-xs font-body italic text-muted-foreground line-clamp-1 mt-0.5">
                {lounge.score_summary}
              </p>
            )}
            <div className="flex items-center gap-1 mt-1">
              <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-primary text-primary" />
              <span className="text-xs font-semibold text-foreground font-body">
                {Number(lounge.rating).toFixed(1)}
              </span>
              <span className="text-[10px] text-muted-foreground font-body">
                ({lounge.review_count})
              </span>
            </div>
          </div>
          <ConnoisseurScoreBadge
            score={lounge.connoisseur_score}
            scoreLabel={lounge.score_label}
            scoreSource={lounge.score_source}
            googleRating={Number(lounge.rating)}
            size="sm"
          />
        </div>
        {lounge.address && (
          <div className="hidden sm:flex items-center gap-1 mt-2 text-[10px] sm:text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="font-body line-clamp-1">{lounge.address}</span>
          </div>
        )}
      </div>
    </Link>
  </motion.div>
);
  const [venueFilter, setVenueFilter] = useState<"all" | "lounge" | "shop">("all");


const CityPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: city, isLoading: cityLoading } = useQuery({
    queryKey: ["city", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: lounges, isLoading: loungesLoading } = useQuery({
    queryKey: ["lounges", city?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lounges")
        .select("*")
        .eq("city_id", city!.id)
        .order("rating", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!city?.id,
  });

  const isLoading = cityLoading || loungesLoading;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{city ? `${city.name} Cigar Lounges — The Connoisseur` : "Loading... — The Connoisseur"}</title>
      </Helmet>
      <Navbar />
      <main className="pt-16">
        {/* Hero */}
        <section className="relative h-64 md:h-80 overflow-hidden">
          {city?.image_url && (
            <OptimizedImage
              src={city.image_url}
              alt={city.name}
              width={1280}
              height={400}
              sizes="100vw"
              widths={[640, 960, 1280]}
              loading="eager"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/30" />
          <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-end pb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 w-fit"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-4xl md:text-5xl font-bold text-foreground"
            >
              {city?.name || "Loading..."}
            </motion.h1>
            {city && (
              <p className="mt-2 text-muted-foreground font-body">
                {city.country} · {city.lounge_count} lounges & shops
              </p>
            )}
          </div>
        </section>

        {/* Lounges & Shops */}
        <section className="container mx-auto px-4 py-12">
          <ScoreExplainer />

          {/* Venue type filter */}
          {!isLoading && lounges && lounges.length > 0 && (
            <div className="flex items-center gap-4 mb-6">
              <Tabs value={venueFilter} onValueChange={(v) => setVenueFilter(v as any)}>
                <TabsList>
                  <TabsTrigger value="all">All ({lounges.length})</TabsTrigger>
                  <TabsTrigger value="lounge" className="gap-1.5">
                    <Sofa className="h-3.5 w-3.5" />
                    Lounges ({lounges.filter(l => l.type === "lounge" || l.type === "both").length})
                  </TabsTrigger>
                  <TabsTrigger value="shop" className="gap-1.5">
                    <Store className="h-3.5 w-3.5" />
                    Shops ({lounges.filter(l => l.type === "shop" || l.type === "both").length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-secondary animate-pulse" />
              ))}
            </div>
          ) : lounges && lounges.length > 0 ? (
            (() => {
              const scoreSort = (a: any, b: any) => {
                const aScore = a.connoisseur_score ?? -1;
                const bScore = b.connoisseur_score ?? -1;
                if (bScore !== aScore) return bScore - aScore;
                return computeWeightedScore(Number(b.rating), b.review_count) -
                  computeWeightedScore(Number(a.rating), a.review_count);
              };

              const filtered = venueFilter === "all"
                ? [...lounges].sort(scoreSort)
                : venueFilter === "lounge"
                  ? [...lounges].filter(l => l.type === "lounge" || l.type === "both").sort(scoreSort)
                  : [...lounges].filter(l => l.type === "shop" || l.type === "both").sort(scoreSort);

              return filtered.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {filtered.map((lounge, index) => (
                    <RankedLoungeCard key={lounge.id} lounge={lounge} rank={index + 1} dimmed={index >= 10} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground font-body text-sm text-center py-8">
                  No {venueFilter === "lounge" ? "lounges" : "shops"} found in this city.
                </p>
              );
            })()
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground font-body">
                No lounges found in this city yet.
              </p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CityPage;
