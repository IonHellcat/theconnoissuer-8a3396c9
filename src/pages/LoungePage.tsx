import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { LoungeWithCity } from "@/lib/types";
import QueryErrorBanner from "@/components/QueryErrorBanner";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  ArrowLeft, Star, MapPin, Phone, Globe, Clock,
  ExternalLink, Navigation, Cigarette, Info, Share2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReviewForm from "@/components/ReviewForm";
import ReviewList from "@/components/ReviewList";
import FavoriteButton from "@/components/FavoriteButton";
import VisitButton from "@/components/VisitButton";
import OptimizedImage from "@/components/OptimizedImage";
import ConnoisseurScoreBadge from "@/components/ConnoisseurScoreBadge";
import GalleryLightbox from "@/components/GalleryLightbox";
import FeatureChips from "@/components/FeatureChips";
import LoungeDetailsCard from "@/components/LoungeDetailsCard";

import LoungeJsonLd from "@/components/LoungeJsonLd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

const priceTierLabel = (tier: number) => "$".repeat(tier);

const LOUNGE_ASPECTS = ["atmosphere", "service", "cigar_selection", "drinks"];
const SHOP_ASPECTS = ["selection", "staff", "pricing"];
const aspectLabel = (key: string) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const sentimentColor = (sentiment: string) => {
  switch (sentiment) {
    case "strength": return "text-green-400";
    case "positive": return "text-emerald-400";
    case "mixed": return "text-yellow-400";
    case "weakness": return "text-red-400";
    default: return "text-muted-foreground";
  }
};

const sentimentDisplay = (sentiment: string) => {
  switch (sentiment) {
    case "strength": return "Strength";
    case "positive": return "Positive";
    case "mixed": return "Mixed";
    case "weakness": return "Weakness";
    default: return "—";
  }
};

const MobileActionBar = ({ lounge, cityName }: { lounge: LoungeWithCity; cityName?: string }) => {
  const { toast } = useToast();

  const handleShare = async () => {
    const url = `https://theconnoisseur.app/lounge/${lounge.slug}`;
    const title = `${lounge.name} — The Connoisseur`;
    const text = `Check out ${lounge.name}${cityName ? ` in ${cityName}` : ""}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Lounge link copied to clipboard" });
    }
  };

  return (
    <div className="fixed bottom-14 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-md border-t border-border/50 px-4 py-3">
      <div className="flex items-center gap-2">
        {lounge.latitude && lounge.longitude && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${lounge.latitude},${lounge.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium font-body hover:bg-primary/90 transition-colors"
          >
            <Navigation className="h-4 w-4" />
            Directions
          </a>
        )}
        {lounge.phone && (
          <a
            href={`tel:${lounge.phone}`}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-border text-foreground text-sm font-medium font-body hover:bg-secondary transition-colors"
          >
            <Phone className="h-4 w-4" />
            Call
          </a>
        )}
        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-border text-foreground text-sm font-medium font-body hover:bg-secondary transition-colors"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>
    </div>
  );
};

const LoungePage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: lounge, isLoading, isError, refetch } = useQuery({
    queryKey: ["lounge", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lounges")
        .select("*, cities!inner(name, slug, country)")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data as unknown as LoungeWithCity;
    },
    enabled: !!slug,
  });

  const city = lounge?.cities;
  const hoursData = lounge?.hours as { weekday_descriptions?: string[]; periods?: any[] } | Record<string, string> | null;
  const weekdayDescriptions = hoursData && 'weekday_descriptions' in hoursData 
    ? (hoursData as { weekday_descriptions?: string[] }).weekday_descriptions 
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{lounge ? `${lounge.name}, ${city?.name} — The Connoisseur` : "Loading... — The Connoisseur"}</title>
        {lounge && (
          <>
            <meta name="description" content={`${lounge.name} in ${city?.name}, ${city?.country}. ${lounge.score_summary || `Rated ${Number(lounge.rating).toFixed(1)} stars.`}`} />
            <meta property="og:title" content={`${lounge.name}, ${city?.name} — The Connoisseur`} />
            <meta property="og:description" content={`${lounge.score_summary || `Rated ${Number(lounge.rating).toFixed(1)} stars with ${lounge.review_count} reviews.`}`} />
            {lounge.image_url && <meta property="og:image" content={lounge.image_url} />}
            <meta property="og:type" content="website" />
            <meta name="twitter:card" content="summary_large_image" />
            <link rel="canonical" href={`https://theconnoisseur.app/lounge/${lounge.slug}`} />
          </>
        )}
      </Helmet>
      {lounge && city && (
        <LoungeJsonLd lounge={lounge} cityName={city.name} cityCountry={city.country} />
      )}
      <Navbar />
      <main className="pt-16">
        {isLoading ? (
          <div className="space-y-4 container mx-auto px-4 py-20">
            <div className="h-80 rounded-xl bg-secondary animate-pulse" />
            <div className="h-8 w-1/3 rounded bg-secondary animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-secondary animate-pulse" />
          </div>
        ) : isError ? (
          <QueryErrorBanner message="Could not load this lounge." onRetry={() => refetch()} />
        ) : !lounge ? (
          <div className="text-center py-32">
            <p className="text-muted-foreground font-body text-lg">Lounge not found</p>
            <Link to="/" className="text-primary text-sm mt-4 inline-block font-body hover:underline">
              Go home
            </Link>
          </div>
        ) : (
          <>
            {/* Hero */}
            <section className="relative h-56 sm:h-72 md:h-96 overflow-hidden">
              <OptimizedImage
                src={lounge.image_url || "/placeholder.svg"}
                alt={lounge.name}
                width={1280}
                height={480}
                sizes="100vw"
                widths={[640, 960, 1280]}
                loading="eager"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
              <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-end pb-4 sm:pb-8">
                <Link
                  to={`/city/${city?.slug}`}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 w-fit"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {city?.name}
                </Link>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-medium font-body px-2.5 py-1 rounded-full bg-primary/20 text-primary capitalize">
                    {lounge.type}
                  </span>
                  <span className="text-sm text-muted-foreground font-body">
                    {priceTierLabel(lounge.price_tier)}
                  </span>
                </div>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-display text-2xl sm:text-3xl md:text-5xl font-bold text-foreground"
                >
                  {lounge.name}
                </motion.h1>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <Star className="h-5 w-5 fill-primary text-primary" />
                    <span className="text-lg font-semibold text-foreground font-body">
                      {Number(lounge.rating).toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground font-body">
                      ({lounge.review_count} reviews)
                    </span>
                  </div>
                  <FavoriteButton loungeId={lounge.id} />
                </div>
              </div>
            </section>

            {/* Mobile Details — shown before score on small screens */}
            <section className="container mx-auto px-4 pt-6 lg:hidden">
              <LoungeDetailsCard
                address={lounge.address}
                phone={lounge.phone}
                website={lounge.website}
                latitude={lounge.latitude}
                longitude={lounge.longitude}
              />
              {/* Mobile Hours */}
              {weekdayDescriptions && weekdayDescriptions.length > 0 && (
                <div className="bg-card rounded-xl border border-border/50 p-6 mt-4">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Hours
                  </h3>
                  <div className="space-y-2">
                    {weekdayDescriptions.map((desc, i) => (
                      <div key={i} className="text-sm font-body text-foreground">
                        {desc}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Content */}
            <section className="container mx-auto px-4 py-6 sm:py-10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
                {/* Main */}
                <div className="lg:col-span-2 space-y-10">
                  {/* Connoisseur Score */}
                  {(() => {
                    const scoreSource = lounge.score_source || "none";
                    const connoisseurScore = lounge.connoisseur_score;
                    const scoreLabel = lounge.score_label;
                    const scoreSummary = lounge.score_summary;
                    const pillarScores = lounge.pillar_scores as Record<string, { sentiment: string; positive: number; negative: number; total: number }> | null;
                    const aspects = lounge.type === "shop" ? SHOP_ASPECTS : LOUNGE_ASPECTS;

                    if (scoreSource === "none") {
                      return (
                        <div className="bg-card rounded-xl border border-border/50 p-6 text-center">
                          <p className="text-muted-foreground font-body">Awaiting Connoisseur Score</p>
                          <p className="text-xs text-muted-foreground font-body mt-2">
                            Google Rating: {Number(lounge.rating).toFixed(1)} ★
                          </p>
                          <p className="text-sm text-primary font-body mt-3">Be the first to rate this lounge</p>
                        </div>
                      );
                    }

                    return (
                      <div className="bg-card rounded-xl border border-border/50 p-6">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                          <ConnoisseurScoreBadge
                            score={connoisseurScore}
                            scoreLabel={scoreLabel}
                            scoreSource={scoreSource}
                            googleRating={Number(lounge.rating)}
                            size="lg"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h2 className="font-display text-xl font-semibold text-foreground">
                                {scoreSource === "verified" ? "Verified Connoisseur Score" : "Estimated Connoisseur Score"}
                              </h2>
                              {scoreSource === "estimated" && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs font-body">
                                      Deterministic score computed from rating quality, review sentiment, volume, prestige, and consistency.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            {scoreSummary && (
                              <p className="text-sm font-body italic text-muted-foreground mt-1">{scoreSummary}</p>
                            )}
                            <p className="text-xs text-muted-foreground font-body mt-2">
                              {scoreSource === "verified"
                                ? `Based on member reviews`
                                : "Based on analysis of public reviews"}
                            </p>
                            {scoreSource === "estimated" && (
                              <p className="text-sm text-primary font-body mt-2">
                                Rate this lounge to help verify the Connoisseur Score
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground font-body mt-2">
                              Google Rating: {Number(lounge.rating).toFixed(1)} ★
                            </p>
                          </div>
                        </div>

                        {/* Aspect Breakdown */}
                        {pillarScores && (
                          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {aspects.map((aspect) => {
                              const data = pillarScores[aspect];
                              if (!data) return (
                                <div key={aspect} className="text-center">
                                  <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mb-1">
                                    {aspectLabel(aspect)}
                                  </p>
                                  <p className="text-sm font-bold font-display text-muted-foreground">—</p>
                                </div>
                              );
                              return (
                                <div key={aspect} className="text-center">
                                  <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mb-1">
                                    {aspectLabel(aspect)}
                                  </p>
                                  <p className={`text-sm font-bold font-display ${sentimentColor(data.sentiment)}`}>
                                    {sentimentDisplay(data.sentiment)}
                                  </p>
                                  {data.total > 0 && (
                                    <p className="text-[10px] text-muted-foreground font-body">
                                      {data.positive}↑ {data.negative}↓
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Features */}
                  {lounge.features && lounge.features.length > 0 && (
                    <FeatureChips features={lounge.features} />
                  )}

                  {/* Cigar Highlights */}
                  {lounge.cigar_highlights && lounge.cigar_highlights.length > 0 && (
                    <div>
                      <h2 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Cigarette className="h-5 w-5 text-primary" />
                        Cigar Selection Highlights
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {lounge.cigar_highlights.map((cigar) => (
                          <div
                            key={cigar}
                            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-secondary/50 border border-border/30"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                            <span className="text-sm font-body text-foreground">{cigar}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gallery */}
                  {lounge.gallery && lounge.gallery.length > 0 && (
                    <GalleryLightbox images={lounge.gallery} loungeName={lounge.name} />
                  )}

                  {/* Reviews */}
                  <div>
                    <h2 className="font-display text-xl font-semibold text-foreground mb-4">Reviews</h2>
                    <ReviewList loungeId={lounge.id} />
                    <div className="mt-6">
                      <ReviewForm loungeId={lounge.id} />
                    </div>
                  </div>
                </div>

                {/* Sidebar — desktop only */}
                <div className="hidden lg:block space-y-6 lg:sticky lg:top-24">
                  <LoungeDetailsCard
                    address={lounge.address}
                    phone={lounge.phone}
                    website={lounge.website}
                    latitude={lounge.latitude}
                    longitude={lounge.longitude}
                  />

                  {/* Hours */}
                  {weekdayDescriptions && weekdayDescriptions.length > 0 && (
                    <div className="bg-card rounded-xl border border-border/50 p-6">
                      <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        Hours
                      </h3>
                      <div className="space-y-2">
                        {weekdayDescriptions.map((desc, i) => (
                          <div key={i} className="text-sm font-body text-foreground">
                            {desc}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Mobile sticky action bar */}
            <MobileActionBar lounge={lounge} cityName={city?.name} />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default LoungePage;
