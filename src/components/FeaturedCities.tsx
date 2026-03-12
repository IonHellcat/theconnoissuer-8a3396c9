import { useRef, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import OptimizedImage from "@/components/OptimizedImage";

const FEATURED_SLUGS = ["dubai", "london", "new-york", "havana"];

const FeaturedCities = () => {
  const { data: cities } = useQuery({
    queryKey: ["featured-cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .in("slug", FEATURED_SLUGS);
      if (error) throw error;
      return FEATURED_SLUGS
        .map((slug) => data.find((c) => c.slug === slug))
        .filter(Boolean) as typeof data;
    },
    staleTime: 1000 * 60 * 10,
  });

  if (!cities || cities.length === 0) return null;

  return (
    <div className="mb-10 sm:mb-14">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6 sm:mb-8"
      >
        <h3 className="font-display text-xl md:text-2xl font-bold text-foreground">
          Featured Destinations
        </h3>
      </motion.div>

      <ScrollDotsCarousel cities={cities} />
  );
};

export default FeaturedCities;
