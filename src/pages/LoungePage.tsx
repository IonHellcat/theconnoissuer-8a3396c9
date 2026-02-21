import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  ArrowLeft, Star, MapPin, Phone, Globe, Clock,
  ExternalLink, Navigation, Cigarette, Info,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReviewForm from "@/components/ReviewForm";
import ReviewList from "@/components/ReviewList";
import FavoriteButton from "@/components/FavoriteButton";
import OptimizedImage from "@/components/OptimizedImage";
import ConnoisseurScoreBadge from "@/components/ConnoisseurScoreBadge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const priceTierLabel = (tier: number) => "$".repeat(tier);

const LOUNGE_PILLARS = ["cigar_selection", "ambiance", "service", "drinks", "value"];
const SHOP_PILLARS = ["selection", "storage", "staff_knowledge", "pricing", "experience"];
const pillarLabel = (key: string) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const LoungePage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: lounge, isLoading } = useQuery({
    queryKey: ["lounge", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lounges")
        .select("*, cities!inner(name, slug, country)")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const city = (lounge as any)?.cities;
  const hoursData = lounge?.hours as { weekday_descriptions?: string[]; periods?: any[] } | Record<string, string> | null;
  const weekdayDescriptions = hoursData && 'weekday_descriptions' in hoursData 
    ? (hoursData as { weekday_descriptions?: string[] }).weekday_descriptions 
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{lounge ? `${lounge.name}, ${city?.name} — The Connoisseur` : "Loading... — The Connoisseur"}</title>
      </Helmet>
      <Navbar />
      <main className="pt-16">
        {isLoading ? (
          <div className="space-y-4 container mx-auto px-4 py-20">
            <div className="h-80 rounded-xl bg-secondary animate-pulse" />
            <div className="h-8 w-1/3 rounded bg-secondary animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-secondary animate-pulse" />
          </div>
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
            <section className="relative h-72 md:h-96 overflow-hidden">
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

            {/* Content */}
            <section className="container mx-auto px-4 py-6 sm:py-10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
                {/* Main */}
                <div className="lg:col-span-2 space-y-10">
                  {/* Connoisseur Score */}
                  {(() => {
                    const scoreSource = (lounge as any).score_source || "none";
                    const connoisseurScore = (lounge as any).connoisseur_score;
                    const scoreLabel = (lounge as any).score_label;
                    const scoreSummary = (lounge as any).score_summary;
                    const pillarScores = (lounge as any).pillar_scores as Record<string, number | null> | null;
                    const pillars = lounge.type === "shop" ? SHOP_PILLARS : LOUNGE_PILLARS;

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
                        <div className="flex items-start gap-6">
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
                                      Estimated Scores are generated by analyzing public reviews. They become Verified when 3+ members submit detailed ratings.
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

                        {/* Pillar Breakdown */}
                        {pillarScores && (
                          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {pillars.map((pillar) => {
                              const val = pillarScores[pillar];
                              return (
                                <div key={pillar} className="text-center">
                                  <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mb-1">
                                    {pillarLabel(pillar)}
                                  </p>
                                  <p className="text-lg font-bold font-display text-foreground">
                                    {val !== null && val !== undefined ? Number(val).toFixed(1) : "—"}
                                  </p>
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
                    <div>
                      <h2 className="font-display text-xl font-semibold text-foreground mb-4">Features</h2>
                      <div className="flex flex-wrap gap-2">
                        {lounge.features.map((feature) => (
                          <span
                            key={feature}
                            className="text-sm font-body px-3 py-1.5 rounded-full bg-secondary text-foreground border border-border/50"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
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
                    <div>
                      <h2 className="font-display text-xl font-semibold text-foreground mb-4">Gallery</h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {lounge.gallery.map((img, i) => (
                          <div key={i} className="aspect-square rounded-lg overflow-hidden bg-secondary">
                            <OptimizedImage
                              src={img}
                              alt={`${lounge.name} photo ${i + 1}`}
                              width={480}
                              height={480}
                              sizes="(max-width: 768px) 50vw, 33vw"
                              widths={[240, 480]}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
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

                {/* Sidebar */}
                <div className="space-y-6">
                  <div className="bg-card rounded-xl border border-border/50 p-6 space-y-5">
                    <h3 className="font-display text-lg font-semibold text-foreground">Details</h3>

                    {lounge.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground font-body">{lounge.address}</span>
                      </div>
                    )}

                    {lounge.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                        <a href={`tel:${lounge.phone}`} className="text-sm text-muted-foreground font-body hover:text-foreground transition-colors">
                          {lounge.phone}
                        </a>
                      </div>
                    )}

                    {lounge.website && (
                      <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-primary flex-shrink-0" />
                        <a
                          href={lounge.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary font-body hover:underline inline-flex items-center gap-1"
                        >
                          Visit Website
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}

                    {lounge.latitude && lounge.longitude && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${lounge.latitude},${lounge.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium font-body hover:bg-primary/90 transition-colors"
                      >
                        <Navigation className="h-4 w-4" />
                        Get Directions
                      </a>
                    )}
                  </div>

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
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default LoungePage;
