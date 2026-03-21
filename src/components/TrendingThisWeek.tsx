import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import OptimizedImage from "./OptimizedImage";
import ConnoisseurScoreBadge from "./ConnoisseurScoreBadge";

const TrendingThisWeek = () => {
  const { data: trending } = useQuery({
    queryKey: ["trending-this-week"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("trending_lounges_this_week" as any);

      if (error) throw error;
      if (!data || (data as any[]).length < 3) return null;

      return (data as any[]).map((row: any) => ({
        count: Number(row.visit_count),
        lounge: {
          id: row.lounge_id,
          name: row.lounge_name,
          slug: row.lounge_slug,
          image_url: row.lounge_image_url_cached || row.lounge_image_url,
          connoisseur_score: row.connoisseur_score,
          score_label: row.score_label,
          score_source: row.score_source,
          rating: row.lounge_rating,
          cities: { name: row.city_name },
        },
      }));
    },
    staleTime: 10 * 60 * 1000,
  });

  if (!trending || trending.length === 0) return null;

  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Trending this week
          </h2>
          <p className="text-muted-foreground font-body mb-6">Most visited lounges in the past 7 days</p>
        </motion.div>

        <div className="flex gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:overflow-visible scrollbar-hide">
          {trending.map((item: any, i: number) => (
            <motion.div
              key={item.lounge.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="min-w-[200px] sm:min-w-0"
            >
              <Link
                to={`/lounge/${item.lounge.slug}`}
                className="group block rounded-xl overflow-hidden bg-card border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <OptimizedImage
                    src={item.lounge.image_url || "/placeholder.svg"}
                    alt={item.lounge.name}
                    width={320}
                    height={240}
                    sizes="(max-width: 640px) 200px, (max-width: 1024px) 33vw, 16vw"
                    widths={[160, 320]}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loungeId={item.lounge.id}
                  />
                  <div className="absolute top-2 right-2">
                    <ConnoisseurScoreBadge
                      score={item.lounge.connoisseur_score}
                      scoreLabel={item.lounge.score_label}
                      scoreSource={item.lounge.score_source}
                      googleRating={item.lounge.rating}
                      size="sm"
                    />
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-display text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {item.lounge.name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">
                    {item.lounge.cities?.name}
                  </p>
                  <p className="text-[10px] text-primary font-body font-medium mt-1">
                    {item.count} {item.count === 1 ? "visit" : "visits"} this week
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingThisWeek;
