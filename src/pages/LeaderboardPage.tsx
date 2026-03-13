import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Trophy, Crown, Medal, Award, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ConnoisseurScoreBadge from "@/components/ConnoisseurScoreBadge";
import QueryErrorBanner from "@/components/QueryErrorBanner";

type VenueFilter = "all" | "lounge" | "shop";

interface LeaderboardLounge {
  id: string;
  name: string;
  slug: string;
  type: string;
  image_url: string | null;
  connoisseur_score: number | null;
  score_label: string | null;
  score_source: string;
  rating: number;
  city_name: string;
  city_slug: string;
  city_country: string;
}

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) return <Crown className="h-6 w-6 text-primary" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-primary/80" />;
  if (rank === 3) return <Award className="h-5 w-5 text-primary/60" />;
  return (
    <span className="text-sm font-display font-bold text-muted-foreground w-6 text-center">
      {rank}
    </span>
  );
};

const LeaderboardRow = ({
  lounge,
  rank,
}: {
  lounge: LeaderboardLounge;
  rank: number;
}) => {
  const city = lounge.cities;
  const isTop3 = rank <= 3;

  return (
    <Link
      to={`/lounge/${lounge.slug}`}
      className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-colors hover:bg-secondary/80 ${
        isTop3 ? "bg-secondary/50 border border-border/50" : ""
      }`}
    >
      {/* Rank */}
      <div className="flex-shrink-0 w-8 flex items-center justify-center">
        <RankIcon rank={rank} />
      </div>

      {/* Image — small thumbnail, eager for top 10, lazy rest */}
      <div className="flex-shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-lg overflow-hidden bg-secondary">
        {lounge.image_url ? (
          <img
            src={lounge.image_url}
            alt=""
            width={56}
            height={56}
            loading={rank <= 10 ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-secondary" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className={`font-display font-semibold text-foreground truncate ${isTop3 ? "text-base" : "text-sm"}`}>
          {lounge.name}
        </h3>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs font-body text-muted-foreground truncate">
            {city?.name}{city?.country ? `, ${city.country}` : ""}
          </span>
          <span className="text-[10px] font-body px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">
            {lounge.type}
          </span>
        </div>
      </div>

      {/* Score */}
      <div className="flex-shrink-0 flex items-center gap-2">
        <ConnoisseurScoreBadge
          score={lounge.connoisseur_score}
          scoreLabel={lounge.score_label}
          scoreSource={lounge.score_source}
          googleRating={Number(lounge.rating)}
          size="sm"
        />
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 hidden sm:block" />
      </div>
    </Link>
  );
};

const LeaderboardPage = () => {
  const [venueFilter, setVenueFilter] = useState<VenueFilter>("all");

  const { data: lounges, isLoading, isError, refetch } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lounges")
        .select("id, name, slug, type, image_url, connoisseur_score, score_label, score_source, rating, cities!inner(name, slug, country)")
        .not("connoisseur_score", "is", null)
        .order("connoisseur_score", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as LeaderboardLounge[];
    },
    staleTime: 30 * 60 * 1000, // 30 min — leaderboard rarely changes
    gcTime: 60 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (!lounges) return undefined;
    if (venueFilter === "all") return lounges;
    return lounges.filter((l) => {
      if (venueFilter === "lounge") return l.type === "lounge" || l.type === "both";
      if (venueFilter === "shop") return l.type === "shop" || l.type === "both";
      return true;
    });
  }, [lounges, venueFilter]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Global Leaderboard — The Connoisseur</title>
        <meta
          name="description"
          content="The world's top-ranked cigar lounges and shops, scored and ranked by the Connoisseur Score system."
        />
        <link rel="canonical" href="https://theconnoisseur.app/leaderboard" />
      </Helmet>
      <Navbar />
      <main className="pt-24 pb-20 md:pb-10">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <Trophy className="h-6 w-6 text-primary" />
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                Global Leaderboard
              </h1>
            </div>
            <p className="text-muted-foreground font-body text-sm max-w-md mx-auto">
              The world's finest cigar lounges and shops, ranked by Connoisseur Score
            </p>
          </div>

          {/* Filters */}
          <div className="flex justify-center mb-6">
            <Tabs
              value={venueFilter}
              onValueChange={(v) => setVenueFilter(v as VenueFilter)}
            >
              <TabsList>
                <TabsTrigger value="all">
                  All{filtered && venueFilter === "all" ? ` (${filtered.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="lounge">Lounges</TabsTrigger>
                <TabsTrigger value="shop">Shops</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="space-y-3 max-w-2xl mx-auto">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl">
                  <div className="h-6 w-6 rounded bg-secondary animate-pulse" />
                  <div className="h-12 w-12 rounded-lg bg-secondary animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded bg-secondary animate-pulse" />
                    <div className="h-3 w-1/4 rounded bg-secondary animate-pulse" />
                  </div>
                  <div className="h-10 w-10 rounded-full bg-secondary animate-pulse" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <QueryErrorBanner message="Could not load leaderboard." onRetry={() => refetch()} />
          ) : filtered && filtered.length > 0 ? (
            <div className="max-w-2xl mx-auto space-y-1">
              {filtered.map((lounge, i) => (
                <LeaderboardRow
                  key={lounge.id}
                  lounge={lounge}
                  rank={i + 1}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground font-body">No ranked venues found yet.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LeaderboardPage;
