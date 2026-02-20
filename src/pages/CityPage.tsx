import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { MapPin, Star, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FavoriteButton from "@/components/FavoriteButton";
import OptimizedImage from "@/components/OptimizedImage";

const priceTierLabel = (tier: number) => "$".repeat(tier);

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

        {/* Lounges List */}
        <section className="container mx-auto px-4 py-12">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-secondary animate-pulse" />
              ))}
            </div>
          ) : lounges && lounges.length > 0 ? (
            <div className="space-y-6">
              {lounges.map((lounge, index) => (
                <motion.div
                  key={lounge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={`/lounge/${lounge.slug}`}
                    className="group block bg-card rounded-xl border border-border/50 overflow-hidden hover:border-primary/30 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row">
                      {/* Image */}
                       <div className="md:w-72 h-48 md:h-auto flex-shrink-0 overflow-hidden relative">
                         <OptimizedImage
                           src={lounge.image_url || "/placeholder.svg"}
                           alt={lounge.name}
                           width={480}
                           height={320}
                           sizes="(max-width: 768px) 100vw, 288px"
                           widths={[320, 480]}
                           className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                         />
                         <div className="absolute top-3 right-3 z-10">
                           <FavoriteButton loungeId={lounge.id} />
                         </div>
                       </div>

                      {/* Content */}
                      <div className="flex-1 p-5 md:p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium font-body px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                                {lounge.type}
                              </span>
                              <span className="text-xs text-muted-foreground font-body">
                                {priceTierLabel(lounge.price_tier)}
                              </span>
                            </div>
                            <h3 className="font-display text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                              {lounge.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Star className="h-4 w-4 fill-primary text-primary" />
                            <span className="text-sm font-semibold text-foreground font-body">
                              {Number(lounge.rating).toFixed(1)}
                            </span>
                            <span className="text-xs text-muted-foreground font-body">
                              ({lounge.review_count})
                            </span>
                          </div>
                        </div>

                        <p className="mt-2 text-sm text-muted-foreground font-body line-clamp-2">
                          {lounge.description}
                        </p>

                        {lounge.address && (
                          <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="font-body">{lounge.address}</span>
                          </div>
                        )}

                        {lounge.features && lounge.features.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {lounge.features.slice(0, 4).map((feature) => (
                              <span
                                key={feature}
                                className="text-xs font-body px-2 py-0.5 rounded-full bg-secondary text-muted-foreground"
                              >
                                {feature}
                              </span>
                            ))}
                            {lounge.features.length > 4 && (
                              <span className="text-xs font-body text-muted-foreground">
                                +{lounge.features.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
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
