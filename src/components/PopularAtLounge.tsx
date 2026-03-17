import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Cigarette, Wine } from "lucide-react";

interface PopularAtLoungeProps {
  loungeId: string;
}

const PopularAtLounge = ({ loungeId }: PopularAtLoungeProps) => {
  const { data } = useQuery({
    queryKey: ["popular-at-lounge", loungeId],
    queryFn: async () => {
      const { data: reviews, error } = await supabase
        .from("reviews")
        .select("cigar_smoked, drink_pairing")
        .eq("lounge_id", loungeId);
      if (error) throw error;

      const cigarCounts: Record<string, number> = {};
      const drinkCounts: Record<string, number> = {};
      let cigarReviewCount = 0;

      (reviews || []).forEach((r: any) => {
        if (r.cigar_smoked) {
          cigarReviewCount++;
          cigarCounts[r.cigar_smoked] = (cigarCounts[r.cigar_smoked] || 0) + 1;
        }
        if (r.drink_pairing) {
          drinkCounts[r.drink_pairing] = (drinkCounts[r.drink_pairing] || 0) + 1;
        }
      });

      if (cigarReviewCount < 3) return null;

      const topCigars = Object.entries(cigarCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      const topDrinks = Object.entries(drinkCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      return { topCigars, topDrinks };
    },
    staleTime: 10 * 60 * 1000,
  });

  if (!data) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="font-display text-xl font-semibold text-foreground mb-4">Popular at this lounge</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {data.topCigars.length > 0 && (
          <div>
            <h3 className="font-body text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
              <Cigarette className="h-4 w-4 text-primary" />
              Most smoked
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.topCigars.map(([name, count]) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 text-sm font-body px-3 py-1.5 rounded-full bg-secondary text-foreground border border-border/50"
                >
                  {name}
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                    {count}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
        {data.topDrinks.length > 0 && (
          <div>
            <h3 className="font-body text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
              <Wine className="h-4 w-4 text-primary" />
              Most paired
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.topDrinks.map(([name, count]) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 text-sm font-body px-3 py-1.5 rounded-full bg-secondary text-foreground border border-border/50"
                >
                  {name}
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                    {count}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PopularAtLounge;
