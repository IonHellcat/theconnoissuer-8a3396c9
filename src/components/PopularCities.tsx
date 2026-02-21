import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CityCard from "./CityCard";
import FeaturedCities from "./FeaturedCities";

const PopularCities = () => {
  const { data: cities, isLoading } = useQuery({
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
            Popular Cities
          </h2>
          <p className="mt-3 text-muted-foreground font-body">
            Explore top cigar destinations around the world
          </p>
        </motion.div>

        <FeaturedCities />

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-secondary animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {cities?.map((city, index) => (
              <CityCard
                key={city.id}
                name={city.name}
                country={city.country}
                loungeCount={city.lounge_count}
                imageUrl={city.image_url || ""}
                slug={city.slug}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PopularCities;
