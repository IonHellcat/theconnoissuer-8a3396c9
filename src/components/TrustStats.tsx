import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const TrustStats = () => {
  const { data } = useQuery({
    queryKey: ["trust-stats"],
    queryFn: async () => {
      const [lounges, cities] = await Promise.all([
        supabase.from("lounges").select("id", { count: "exact", head: true }),
        supabase.from("cities").select("id", { count: "exact", head: true }),
      ]);
      return {
        loungeCount: lounges.count ?? 0,
        cityCount: cities.count ?? 0,
      };
    },
    staleTime: 1000 * 60 * 10,
  });

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="flex items-center justify-center gap-2 mt-6 text-base md:text-lg text-muted-foreground"
    >
      <span className="font-display font-bold text-primary text-lg md:text-xl">{data.loungeCount.toLocaleString()}</span>
      <span>lounges across</span>
      <span className="font-display font-bold text-primary text-lg md:text-xl">{data.cityCount.toLocaleString()}</span>
      <span>cities worldwide</span>
    </motion.div>
  );
};

export default TrustStats;
