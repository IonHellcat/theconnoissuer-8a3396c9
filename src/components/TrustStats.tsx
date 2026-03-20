import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TrustStats = () => {
  const { data } = useQuery({
    queryKey: ["trust-stats"],
    queryFn: async () => {
      const [lounges, cities] = await Promise.all([
      supabase.from("lounges").select("id", { count: "exact", head: true }),
      supabase.from("cities").select("id", { count: "exact", head: true })]
      );
      return {
        loungeCount: lounges.count ?? 0,
        cityCount: cities.count ?? 0
      };
    },
    staleTime: 1000 * 60 * 10
  });

  if (!data) return null;

  return (
    <div
      className="animate-hero-fade-in-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mt-6 text-sm sm:text-base md:text-lg text-muted-foreground px-4">
      
      <span className="font-display font-bold text-primary text-base sm:text-lg md:text-xl">{data.loungeCount.toLocaleString()}</span>
      <span>lounges across</span>
      <span className="font-display font-bold text-primary text-base sm:text-lg md:text-xl">{data.cityCount.toLocaleString()}</span>
      <span>cities worldwide</span>
    </div>);

};

export default TrustStats;