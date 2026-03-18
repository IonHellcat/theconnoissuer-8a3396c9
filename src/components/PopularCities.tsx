import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FeaturedCities from "./FeaturedCities";
import { ArrowRight } from "lucide-react";

const PopularCities = () => {
  const { data: cities } = useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .order("lounge_count", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalCount = cities?.length ?? 0;

  return (
    <section className="py-12 sm:py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Popular Destinations
          </h2>
          <p className="mt-3 text-muted-foreground font-body">
            Explore top cigar destinations around the world
          </p>
        </motion.div>

        <FeaturedCities />

        <div className="mt-8 text-center">
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 text-primary font-medium font-body hover:underline transition-colors"
          >
            Explore all {totalCount} cities <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PopularCities;
